<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$upload_dir = __DIR__ . '/uploads/';
$test_file = $upload_dir . 'test.txt';

echo 'Current user: ' . get_current_user() . "<br>";
echo 'Upload directory: ' . $upload_dir . "<br>";

if (is_writable($upload_dir)) {
    echo 'Upload directory is writable.<br>';
} else {
    echo 'Upload directory is NOT writable.<br>';
}

if (file_put_contents($test_file, 'test')) {
    echo 'Successfully wrote to test file.<br>';
    unlink($test_file);
} else {
    echo 'Failed to write to test file.<br>';
}
?>