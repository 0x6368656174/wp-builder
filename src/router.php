<?php

function toWebPack($url) {
  $themeRx = '/^\/wp-content\/themes\//i';
  $webPackDevServerRx = '/^\/webpack-dev-server/i';
  if (preg_match($themeRx, $url)) {
    return true;
  }
  if (preg_match($webPackDevServerRx, $url)) {
    return true;
  }
}

// Если запрашиваем данные из темы, то вернем их из WebPack Dev Server
if (toWebPack($_SERVER["REQUEST_URI"])) {
  $url = $_SERVER['REQUEST_URI'];

  $path = parse_url($url, PHP_URL_PATH);
  $query = parse_url($url, PHP_URL_QUERY);

  $newPath = ltrim($path, '/');
  if ($query) {
    $newPath .= '?' . $query;
  }

  $base = 'http://%HOST%:%UPDATE_PORT%/';
  $proxyUrl = $base . $newPath;

  // Получим контент из WebPack Dev Server
  $contents = @file_get_contents($proxyUrl /* , false, $context */);

  // Получаем заголовки ответа из глобальной переменной (PHP)
  $headers = $http_response_header;

  if ($contents === false) {
    $firstLine = $headers[0];
    $stderr = fopen('php://stderr', 'w');
    fwrite($stderr, "Request failed: $proxyUrl - $firstLine\n");
    header("HTTP/1.1 503 Proxy error");
    die("Proxy failed to get contents at $proxyUrl");
  }

  // Прокидываем разрешенные заголовки
  $allowedHeaders = "!^(http/1.1|server:|content-type:|last-modified|access-control-allow-origin|Content-Length:|Etag:|Accept-Ranges:|Date:|Via:|Connection:|X-|age|cache-control|vary)!i";
  foreach ($headers as $header) {
    if (preg_match($allowedHeaders, $header)) {
      header($header);
    }
  }
  header('X-Powered-By: Webpack');

  echo $contents;
  return true;
}

return false;
