<?php

require_once( __DIR__ . '/../../../vendor/autoload.php' );
$timber = new Timber\Timber();

/**
 * Добавим все файлы из functions.php.d
 */
$files = glob(get_template_directory() . "/functions.php.d/*.php");
foreach ($files as $filename)
{
  require_once($filename);
}
