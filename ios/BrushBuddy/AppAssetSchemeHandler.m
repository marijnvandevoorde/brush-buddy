#import "AppAssetSchemeHandler.h"
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

static NSString *const kScheme = @"brushbuddy";
static NSString *const kHost = @"app";

@implementation AppAssetSchemeHandler {
    NSURL *_root;
}

+ (NSString *)scheme { return kScheme; }

+ (NSURL *)startURL {
    return [NSURL URLWithString:[NSString stringWithFormat:@"%@://%@/index.html", kScheme, kHost]];
}

- (instancetype)initWithRoot:(NSURL *)root {
    if ((self = [super init])) {
        _root = [root URLByStandardizingPath];
    }
    return self;
}

- (void)webView:(WKWebView *)webView startURLSchemeTask:(id<WKURLSchemeTask>)urlSchemeTask {
    NSURL *url = urlSchemeTask.request.URL;
    NSURL *file = [self resolve:url];
    if (file == nil) {
        [urlSchemeTask didFailWithError:[NSError errorWithDomain:NSURLErrorDomain
                                                            code:NSURLErrorFileDoesNotExist
                                                        userInfo:nil]];
        return;
    }

    NSData *data = [NSData dataWithContentsOfURL:file];
    if (data == nil) {
        [urlSchemeTask didFailWithError:[NSError errorWithDomain:NSURLErrorDomain
                                                            code:NSURLErrorCannotOpenFile
                                                        userInfo:nil]];
        return;
    }

    NSHTTPURLResponse *response =
        [[NSHTTPURLResponse alloc] initWithURL:url
                                    statusCode:200
                                   HTTPVersion:@"HTTP/1.1"
                                  headerFields:@{
                                      @"Content-Type": [self mimeTypeFor:file],
                                      @"Content-Length": @(data.length).stringValue,
                                      // Everything is local; caching only delays
                                      // what a new build ships.
                                      @"Cache-Control": @"no-cache",
                                  }];
    [urlSchemeTask didReceiveResponse:response];
    [urlSchemeTask didReceiveData:data];
    [urlSchemeTask didFinish];
}

- (void)webView:(WKWebView *)webView stopURLSchemeTask:(id<WKURLSchemeTask>)urlSchemeTask {
    // Every response is delivered synchronously, so there is nothing to cancel.
}

/// Maps a request URL onto a file inside `www`, refusing anything that resolves
/// outside it.
- (nullable NSURL *)resolve:(NSURL *)url {
    if (![url.scheme isEqualToString:kScheme]) return nil;

    NSString *path = url.path;
    if (path.length == 0 || [path isEqualToString:@"/"]) path = @"/index.html";

    NSURL *candidate = [[_root URLByAppendingPathComponent:path] URLByStandardizingPath];
    NSString *rootPath = _root.path;
    BOOL inside = [candidate.path isEqualToString:rootPath] ||
                  [candidate.path hasPrefix:[rootPath stringByAppendingString:@"/"]];
    if (!inside) return nil;

    return [NSFileManager.defaultManager fileExistsAtPath:candidate.path] ? candidate : nil;
}

- (NSString *)mimeTypeFor:(NSURL *)file {
    NSString *ext = file.pathExtension.lowercaseString;
    // The two the system still gets wrong or vague.
    if ([ext isEqualToString:@"js"]) return @"text/javascript";
    if ([ext isEqualToString:@"webmanifest"]) return @"application/manifest+json";

    UTType *type = [UTType typeWithFilenameExtension:ext];
    return type.preferredMIMEType ?: @"application/octet-stream";
}

@end
