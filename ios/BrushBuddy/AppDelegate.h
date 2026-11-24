#import <UIKit/UIKit.h>

@interface AppDelegate : UIResponder <UIApplicationDelegate>
@end

/// Owns the app's single window. iOS 27 refuses to launch apps built with its
/// SDK that do not adopt the scene lifecycle.
@interface SceneDelegate : UIResponder <UIWindowSceneDelegate>
@property (nonatomic, strong) UIWindow *window;
@end
