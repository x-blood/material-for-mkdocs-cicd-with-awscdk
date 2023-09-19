function handler(event) {
    var request = event.request;
    var headers = request.headers;
    var uri = request.uri;

    // echo -n user:pass | base64
    var authString = "Basic dXNlcjpwYXNz";

    if (
        typeof headers.authorization === "undefined" ||
        headers.authorization.value !== authString
    ) {
        return {
            statusCode: 401,
            statusDescription: "Unauthorized",
            headers: { "www-authenticate": { value: "Basic" } }
        };
    }

    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    }
    else if (!uri.includes('.')) {
        request.uri += '/index.html';
    }

    return request;
}