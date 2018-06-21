<?php

declare(strict_types=1);

require_once __DIR__.'/../../../vendor/autoload.php';

use Timber\Timber;

$timber = new Timber();

/**
 * Добавим все файлы из functions.php.d.
 */
$files = \glob(get_template_directory().'/functions.php.d/*.php');
foreach ($files as $filename) {
  require_once $filename;
}
