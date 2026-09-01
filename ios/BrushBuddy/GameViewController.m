#import "GameViewController.h"
#import "AppAssetSchemeHandler.h"
#import <WebKit/WebKit.h>

/// The app itself is unchanged from the web build; this controller only
/// supplies what a browser would have — a full-screen surface with no chrome, a
/// WebView tuned for small hands (no zoom, no rubber-band scrolling, no text
/// selection), and safe-area insets the app's CSS already knows how to pad for.
///
/// Inline playback is enabled and user-action gating turned off so the hero
/// clips can autoplay over the finale. They are VP9-in-WebM, which WKWebView
/// may refuse; app.js already falls back to its built-in SVG mascot when the
/// video errors, so a refusal costs the animation, not the app.
@interface GameViewController () <WKNavigationDelegate>
@property (nonatomic, strong) WKWebView *webView;
@property (nonatomic, assign) BOOL pinsOrientation;
@end

@implementation GameViewController

- (void)viewDidLoad {
    [super viewDidLoad];

    UIColor *brand = [UIColor colorNamed:@"BrandBackground"] ?: UIColor.systemPurpleColor;
    self.view.backgroundColor = brand;

    NSURL *root = [NSBundle.mainBundle URLForResource:@"www" withExtension:nil];
    NSAssert(root != nil, @"www/ is missing from the bundle — the Sync web app build phase did not run.");

    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    [config setURLSchemeHandler:[[AppAssetSchemeHandler alloc] initWithRoot:root]
                   forURLScheme:AppAssetSchemeHandler.scheme];
    config.allowsInlineMediaPlayback = YES;
    config.mediaTypesRequiringUserActionForPlayback = WKAudiovisualMediaTypeNone;
    config.suppressesIncrementalRendering = YES;

    self.webView = [[WKWebView alloc] initWithFrame:CGRectZero configuration:config];
    self.webView.opaque = NO;
    self.webView.backgroundColor = brand;
    self.webView.scrollView.bounces = NO;
    self.webView.scrollView.scrollEnabled = NO;
    self.webView.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    self.webView.allowsBackForwardNavigationGestures = NO;
    self.webView.navigationDelegate = self;
#if DEBUG
    if (@available(iOS 16.4, *)) self.webView.inspectable = YES;
#endif

    self.webView.translatesAutoresizingMaskIntoConstraints = NO;
    [self.view addSubview:self.webView];
    [NSLayoutConstraint activateConstraints:@[
        [self.webView.topAnchor constraintEqualToAnchor:self.view.topAnchor],
        [self.webView.bottomAnchor constraintEqualToAnchor:self.view.bottomAnchor],
        [self.webView.leadingAnchor constraintEqualToAnchor:self.view.leadingAnchor],
        [self.webView.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor],
    ]];

    [self.webView loadRequest:[NSURLRequest requestWithURL:AppAssetSchemeHandler.startURL]];
}

// Nothing but the timer on screen: no status bar, and no home indicator once the
// child has settled in.
- (BOOL)prefersStatusBarHidden { return YES; }
- (BOOL)prefersHomeIndicatorAutoHidden { return YES; }

- (UIInterfaceOrientationMask)supportedInterfaceOrientations {
#if DEBUG
    // The screenshot script pins the orientation by launch argument; the
    // simulator has no other way to be told to rotate. Only applied once the
    // window exists (see -pinScreenshotOrientation), because restricting the
    // set before the first layout can leave iOS with no valid orientation to
    // launch into, which it treats as a fatal error.
    if (self.pinsOrientation) {
        NSString *want = [NSUserDefaults.standardUserDefaults stringForKey:@"sceneOrientation"];
        if ([want isEqualToString:@"landscape"]) return UIInterfaceOrientationMaskLandscape;
        if ([want isEqualToString:@"portrait"]) return UIInterfaceOrientationMaskPortrait;
    }
#endif
    return UIDevice.currentDevice.userInterfaceIdiom == UIUserInterfaceIdiomPad
        ? UIInterfaceOrientationMaskAll
        : (UIInterfaceOrientationMaskPortrait | UIInterfaceOrientationMaskLandscape);
}

- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
    [self pinScreenshotOrientation];
}

#pragma mark - Navigation

/// The app never links out; anything that tries is ignored rather than handed
/// to Safari.
- (void)webView:(WKWebView *)webView
    decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction
                    decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    BOOL inApp = [navigationAction.request.URL.scheme isEqualToString:AppAssetSchemeHandler.scheme];
    decisionHandler(inApp ? WKNavigationActionPolicyAllow : WKNavigationActionPolicyCancel);
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    [self runScreenshotSceneIfRequested];
}

#pragma mark - Screenshot support

- (void)pinScreenshotOrientation {
#if DEBUG
    NSString *want = [NSUserDefaults.standardUserDefaults stringForKey:@"sceneOrientation"];
    if (want.length == 0 || self.pinsOrientation) return;

    self.pinsOrientation = YES;
    UIInterfaceOrientationMask mask = [want isEqualToString:@"landscape"]
        ? UIInterfaceOrientationMaskLandscape
        : UIInterfaceOrientationMaskPortrait;

    if (@available(iOS 16.0, *)) {
        [self setNeedsUpdateOfSupportedInterfaceOrientations];
        UIWindowScene *scene = self.view.window.windowScene;
        [scene requestGeometryUpdateWithPreferences:
            [[UIWindowSceneGeometryPreferencesIOS alloc] initWithInterfaceOrientations:mask]
                                       errorHandler:nil];
    }
#endif
}

/// Debug-build hook for a store screenshot script: the capture
/// script passes the scene library and a scene name as launch arguments so
/// every store screenshot shows the same state on every simulator.
///
///   -sceneLibrary <base64 js> -sceneName splits_win
///
/// The outcome is written to Documents/scene-status.txt, which the script
/// polls — the only channel out of a simulator that does not involve scraping
/// the system log. Compiled out of release builds.
- (void)runScreenshotSceneIfRequested {
#if DEBUG
    NSUserDefaults *defaults = NSUserDefaults.standardUserDefaults;
    NSString *encoded = [defaults stringForKey:@"sceneLibrary"];
    NSString *scene = [defaults stringForKey:@"sceneName"];
    if (encoded.length == 0 || scene.length == 0) return;

    NSData *data = [[NSData alloc] initWithBase64EncodedString:encoded options:0];
    NSString *library = data ? [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] : nil;
    if (library == nil) {
        [self writeSceneStatus:[NSString stringWithFormat:@"FAIL %@ unreadable library", scene]];
        return;
    }

    __weak typeof(self) weakSelf = self;
    [self.webView evaluateJavaScript:library completionHandler:^(id result, NSError *error) {
        typeof(self) self_ = weakSelf;
        if (self_ == nil) return;
        if (error) {
            [self_ writeSceneStatus:
                [NSString stringWithFormat:@"FAIL %@ library: %@", scene, error.localizedDescription]];
            return;
        }
        // callAsyncJavaScript awaits the scene's promise, so the status is only
        // written once the state is actually on screen.
        [self_.webView callAsyncJavaScript:@"return await __scene(name);"
                                 arguments:@{@"name": scene}
                                   inFrame:nil
                            inContentWorld:WKContentWorld.pageWorld
                         completionHandler:^(id value, NSError *callError) {
            if (callError) {
                [self_ writeSceneStatus:
                    [NSString stringWithFormat:@"FAIL %@ %@", scene, callError.localizedDescription]];
                return;
            }
            NSString *outcome = [value isKindOfClass:NSString.class] ? value : @"ok";
            [self_ writeSceneStatus:[outcome isEqualToString:@"ok"]
                ? [NSString stringWithFormat:@"DONE %@", scene]
                : [NSString stringWithFormat:@"FAIL %@ %@", scene, outcome]];
        }];
    }];
#endif
}

#if DEBUG
- (void)writeSceneStatus:(NSString *)status {
    NSURL *dir = [NSFileManager.defaultManager URLsForDirectory:NSDocumentDirectory
                                                      inDomains:NSUserDomainMask].firstObject;
    if (dir == nil) return;
    [status writeToURL:[dir URLByAppendingPathComponent:@"scene-status.txt"]
            atomically:YES encoding:NSUTF8StringEncoding error:nil];
}
#endif

@end
