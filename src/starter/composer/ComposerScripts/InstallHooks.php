<?php
namespace ComposerScripts;

use Composer\Script\Event;
use Composer\Installer\PackageEvent;


class InstallHooks
{
    public static function localConf(Event $event)
    {
      // Копируем index.php
      $indexContent = file_get_contents('dist/wordpress/index.php');
      $indexContent = str_replace("'/wp-blog-header.php'", "'/wordpress/wp-blog-header.php'", $indexContent);
      file_put_contents('dist/index.php', $indexContent);

      // Копируем config.php
      $DB_NAME = 'database_name_here';
      $DB_USER = 'username_here';
      $DB_PASSWORD = 'password_here';
      $DB_HOST = 'localhost';
      $WP_DEBUG = 'false';
      if (file_exists('dist/wp-config.php')) {
        $wpConfigContent = file_get_contents('dist/wp-config.php');
        preg_match("/define\('DB_NAME', '([^']+)'\);/", $wpConfigContent, $matches);
        $DB_NAME = $matches[1];
        preg_match("/define\('DB_USER', '([^']+)'\);/", $wpConfigContent, $matches);
        $DB_USER = $matches[1];
        preg_match("/define\('DB_PASSWORD', '([^']+)'\);/", $wpConfigContent, $matches);
        $DB_PASSWORD = $matches[1];
        preg_match("/define\('DB_HOST', '([^']+)'\);/", $wpConfigContent, $matches);
        $DB_HOST = $matches[1];
        preg_match("/define\('WP_DEBUG', ([^']+)\);/", $wpConfigContent, $matches);
        $WP_DEBUG = $matches[1];
      }
      $wpConfigContent = file_get_contents('dist/wordpress/wp-config-sample.php');
      $wpConfigContent = str_replace("define('DB_NAME', 'database_name_here');", "define('DB_NAME', '{$DB_NAME}');", $wpConfigContent);
      $wpConfigContent = str_replace("define('DB_USER', 'username_here');", "define('DB_USER', '{$DB_USER}');", $wpConfigContent);
      $wpConfigContent = str_replace("define('DB_PASSWORD', 'password_here');", "define('DB_PASSWORD', '{$DB_PASSWORD}');", $wpConfigContent);
      $wpConfigContent = str_replace("define('DB_HOST', 'localhost');", "define('DB_HOST', '{$DB_HOST}');", $wpConfigContent);
      $wpConfigContent = str_replace("define('DB_DEBUG', false);", "define('WP_DEBUG', {$WP_DEBUG});", $wpConfigContent);

      $customConfigs = <<<'CONFIG'
define( 'WP_CONTENT_DIR', dirname(__FILE__) . '/wp-content' );
define( 'WP_CONTENT_URL', 'http://' . $_SERVER['HTTP_HOST'] . '/wp-content' );

/* That's all, stop editing! Happy blogging. */
CONFIG;

      $wpConfigContent = str_replace("/* That's all, stop editing! Happy blogging. */", $customConfigs, $wpConfigContent);
      file_put_contents('dist/wp-config.php', $wpConfigContent);

      $htaccess = <<<'HTACCESS'
# BEGIN WordPress
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.php$ - [L]
  RewriteRule ^wp-admin/(.*)$ /wordpress/wp-admin/$1 [R=302,L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.php [L]
</IfModule>
# END WordPress
HTACCESS;

      file_put_contents('dist/.htaccess', $htaccess);
    }
}
