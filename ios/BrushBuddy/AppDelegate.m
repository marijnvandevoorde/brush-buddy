#import "AppDelegate.h"
#import "GameViewController.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
didFinishLaunchingWithOptions:(NSDictionary<UIApplicationLaunchOptionsKey, id> *)launchOptions {
    self.window = [[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];
    self.window.rootViewController = [[GameViewController alloc] init];
    [self.window makeKeyAndVisible];

    // The whole app is a two-minute timer the child watches while brushing,
    // with both hands busy. Letting the screen dim halfway through would hide
    // the one thing they are meant to be looking at.
    application.idleTimerDisabled = YES;
    return YES;
}

@end
