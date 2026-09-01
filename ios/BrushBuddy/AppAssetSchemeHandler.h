#import <Foundation/Foundation.h>
#import <WebKit/WebKit.h>

NS_ASSUME_NONNULL_BEGIN

/// Serves the bundled web app out of `www/` under a private URL scheme.
///
/// The iOS counterpart to the Android `AssetServer`. A plain `file://` load
/// would also render the app, but WebKit gives file URLs an opaque origin and
/// denies them `localStorage` — which is where the chosen buddy, the language
/// and the brushing streak live. A custom scheme gets a normal origin, so the app behaves exactly like
/// the web build while still never touching the network.
@interface AppAssetSchemeHandler : NSObject <WKURLSchemeHandler>

@property (class, nonatomic, readonly) NSString *scheme;
@property (class, nonatomic, readonly) NSURL *startURL;

/// @param root the bundled `www` directory.
- (instancetype)initWithRoot:(NSURL *)root NS_DESIGNATED_INITIALIZER;
- (instancetype)init NS_UNAVAILABLE;

@end

NS_ASSUME_NONNULL_END
