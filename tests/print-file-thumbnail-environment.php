<?php
/**
 * Diagnoses the server prerequisites used to render Print File thumbnails.
 * Run with PHP CLI on the WordPress server; pass an AI/PDF path to test that file too.
 */

declare(strict_types=1);

/**
 * Runs one safe renderer probe and returns its exit code and captured output.
 * The command and every path are assembled from fixed arguments and shell-escaped values.
 */
function thumbnail_probe(string $binary, string $input, string $output): array
{
    if (!function_exists('proc_open')) {
        return ['exit_code' => 1, 'output' => 'proc_open is disabled'];
    }

    $command = implode(' ', [
        escapeshellarg($binary), '-q', '-dSAFER', '-dBATCH', '-dNOPAUSE',
        '-dFirstPage=1', '-dLastPage=1',
        strtolower(pathinfo($input, PATHINFO_EXTENSION)) === 'ai' ? '-dEPSCrop' : '',
        '-sDEVICE=png16m', '-r96',
        '-sOutputFile=' . escapeshellarg($output), escapeshellarg($input),
    ]);
    $pipes = [];
    $process = proc_open($command, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    if (!is_resource($process)) {
        return ['exit_code' => 1, 'output' => 'proc_open could not start Ghostscript'];
    }

    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    return ['exit_code' => proc_close($process), 'output' => trim($stdout . "\n" . $stderr)];
}

/**
 * Creates a minimal EPS fixture so the test separates Ghostscript capability from AI-file validity.
 * The fixture is removed by the caller after the probe completes.
 */
function thumbnail_eps_fixture(string $path): void
{
    $eps = "%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 240 120\n"
        . "newpath 10 10 moveto 230 10 lineto 230 110 lineto 10 110 closepath\n"
        . "0.2 0.5 0.9 setrgbcolor fill showpage\n";
    if (file_put_contents($path, $eps) === false) {
        throw new RuntimeException('Cannot write EPS fixture: ' . $path);
    }
}

$binary = '';
foreach (['/usr/bin/gs', '/usr/local/bin/gs', '/bin/gs'] as $candidate) {
    if (is_executable($candidate)) {
        $binary = $candidate;
        break;
    }
}
$input = $argv[1] ?? '';
if ($input !== '' && $input[0] !== '/') $input = dirname(__DIR__) . '/' . ltrim($input, '/');
$temporary = [];
$fixture = tempnam(sys_get_temp_dir(), 'print-thumb-');
$output = tempnam(sys_get_temp_dir(), 'print-thumb-');
if (!$fixture || !$output) {
    fwrite(STDERR, "FAIL: cannot create temporary probe files\n");
    exit(1);
}
$temporary = [$fixture, $output];
try {
    thumbnail_eps_fixture($fixture);
    $result = [
        'php_version' => PHP_VERSION,
        'proc_open_available' => function_exists('proc_open'),
        'disabled_functions' => (string) ini_get('disable_functions'),
        'ghostscript' => $binary ?: null,
        'fixture_readable' => is_readable($fixture),
        'output_directory_writable' => is_writable(dirname($output)),
    ];
    if (!$binary) {
        $result['fixture_probe'] = ['status' => 'blocked', 'error' => 'gs not found at plugin-supported paths'];
    } else {
        $probe = thumbnail_probe($binary, $fixture, $output);
        $image = is_file($output) ? @getimagesize($output) : false;
        $result['fixture_probe'] = [
            'status' => $probe['exit_code'] === 0 && $image ? 'passed' : 'failed',
            'exit_code' => $probe['exit_code'],
            'output_bytes' => is_file($output) ? filesize($output) : 0,
            'image_size' => $image ? [$image[0], $image[1]] : null,
            'error' => $probe['output'],
        ];
        if ($input !== '') {
            $ai_output = tempnam(sys_get_temp_dir(), 'print-thumb-ai-');
            $temporary[] = $ai_output;
            $ai_probe = is_file($input) && is_readable($input)
                ? thumbnail_probe($binary, $input, $ai_output)
                : ['exit_code' => 1, 'output' => 'Input file is missing or unreadable'];
            $ai_image = is_file($ai_output) ? @getimagesize($ai_output) : false;
            $copy_base = tempnam(sys_get_temp_dir(), 'print-ai-copy-');
            $copy = $copy_base ? $copy_base . '.ai' : false;
            if ($copy_base) @unlink($copy_base);
            $copy_output = tempnam(sys_get_temp_dir(), 'print-ai-out-');
            $temporary[] = $copy; $temporary[] = $copy_output;
            $copy_probe = ['exit_code' => 1, 'output' => 'Copy could not be created'];
            $copy_image = false;
            if ($copy && $copy_output && is_file($input) && @copy($input, $copy)) {
                $copy_probe = thumbnail_probe($binary, $copy, $copy_output);
                $copy_image = is_file($copy_output) ? @getimagesize($copy_output) : false;
            }
            $result['input_probe'] = [
                'path' => $input, 'readable' => is_readable($input),
                'status' => $copy_probe['exit_code'] === 0 && $copy_image ? 'passed' : 'failed',
                'exit_code' => $ai_probe['exit_code'], 'output_bytes' => is_file($ai_output) ? filesize($ai_output) : 0,
                'image_size' => $ai_image ? [$ai_image[0], $ai_image[1]] : null, 'error' => $ai_probe['output'],
                'file_exists' => is_file($input), 'file_readable' => is_readable($input),
                'file_bytes' => is_file($input) ? filesize($input) : 0, 'realpath' => realpath($input) ?: null,
                'copy_probe' => ['status' => $copy_probe['exit_code'] === 0 && $copy_image ? 'passed' : 'failed', 'error' => $copy_probe['output'], 'image_size' => $copy_image ? [$copy_image[0], $copy_image[1]] : null],
            ];
        }
    }
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
    if (($result['fixture_probe']['status'] ?? '') !== 'passed') fwrite(STDERR, "Fixture probe failed: " . ($result['fixture_probe']['error'] ?? 'unknown') . "\n");
    if (isset($result['input_probe']) && ($result['input_probe']['status'] ?? '') !== 'passed') fwrite(STDERR, "Input copy_status=" . ($result['input_probe']['copy_probe']['status'] ?? 'unknown') . "; copy_error=" . ($result['input_probe']['copy_probe']['error'] ?? 'none') . "; direct=" . ($result['input_probe']['error'] ?? 'unknown') . "; exists=" . ($result['input_probe']['file_exists'] ? 'yes' : 'no') . "; readable=" . ($result['input_probe']['file_readable'] ? 'yes' : 'no') . "; bytes=" . ($result['input_probe']['file_bytes'] ?? 0) . "\n");
    $fixturePassed = ($result['fixture_probe']['status'] ?? '') === 'passed';
    $inputPassed = !array_key_exists('input_probe', $result) || ($result['input_probe']['status'] ?? '') === 'passed';
    exit($fixturePassed && $inputPassed ? 0 : 1);
} finally {
    foreach ($temporary as $path) {
        if (is_string($path) && $path !== '' && is_file($path)) @unlink($path);
    }
}
