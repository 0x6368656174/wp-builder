<?php
if (substr($_SERVER["REQUEST_URI"], 0,32) == '/wp-content/themes/project-theme') {
    // Для вывода данных в консоль
    $stderr = fopen('php://stderr', 'w');
    $url = $_SERVER['REQUEST_URI'];
    $path = parse_url($url, PHP_URL_PATH);
    $query = parse_url($url, PHP_URL_QUERY);
    $newPath = ltrim($path, '/');
    if ($query) {
        $newPath .= '?' . $query;
    }

    $base = 'http://localhost:4201/';
    $proxyUrl = $base . $newPath;

// $context = stream_context_create();
    $contents = @file_get_contents($proxyUrl /* , false, $context */);
// Получаем заголовки ответа из глобальной переменной (PHP!)
    $headers = $http_response_header;
    $firstLine = $headers[0];
    if ($contents === false) {
        fwrite($stderr, "Request failed: $proxyUrl - $firstLine\n");
        header("HTTP/1.1 503 Proxy error");
        die("Proxy failed to get contents at $proxyUrl");
    }
//    fwrite($stderr, "$proxyUrl - OK: $firstLine\n");
    $allowedHeaders = "!^(http/1.1|server:|content-type:|last-modified|access-control-allow-origin|Content-Length:|Etag:|Accept-Ranges:|Date:|Via:|Connection:|X-|age|cache-control|vary)!i";
// Прокидываем разрешенные заголовки
    foreach ($headers as $header) {
        if (preg_match($allowedHeaders, $header)) {
            header($header);
        }
    }
    header('From-Webpack: true');
    echo $contents;
    return true;
}

return false;
