#import "AppDelegate.h"
#import "GameViewController.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
didFinishLaunchingWithOptions:(NSDictionary<UIApplicationLaunchOptionsKey, id> *)launchOptions {
    // The whole app is a two-minute timer the child watches while brushing,
    // with both hands busy. Letting the screen dim halfway through would hide
    // the one thing they are meant to be looking at.
    application.idleTimerDisabled = YES;
    return YES;
}

@end

@implementation SceneDelegate

- (void)scene:(UIScene *)scene
    willConnectToSession:(UISceneSession *)session
                 options:(UISceneConnectionOptions *)connectionOptions {
    if (![scene isKindOfClass:UIWindowScene.class]) return;
    self.window = [[UIWindow alloc] initWithWindowScene:(UIWindowScene *)scene];
    self.window.rootViewController = [[GameViewController alloc] init];
    [self.window makeKeyAndVisible];
}

@end
