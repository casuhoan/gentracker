<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
session_start();

header('Content-Type: application/json');

// --- HELPERS ---
function is_logged_in() {
    return isset($_SESSION['username']);
}

function is_admin() {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

function get_user_data_dir() {
    if (!is_logged_in()) return null; // Or handle error appropriately
    return __DIR__ . '/../data/users/' . $_SESSION['username'] . '/';
}

function get_users_file() {
    return __DIR__ . '/users.json';
}

// --- AUTHENTICATION FUNCTIONS ---
function login() {
    $users_file = get_users_file();
    if (!file_exists($users_file)) {
        echo json_encode(['status' => 'error', 'message' => 'Nessun utente configurato.']);
        return;
    }

    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    $users = json_decode(file_get_contents($users_file), true);
    foreach ($users as $user) {
        if ($user['username'] === $username && password_verify($password, $user['passwordHash'])) {
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            echo json_encode(['status' => 'success', 'message' => 'Login effettuato con successo.']);
            return;
        }
    }

    echo json_encode(['status' => 'error', 'message' => 'Credenziali non valide.']);
}

function logout() {
    session_destroy();
    echo json_encode(['status' => 'success', 'message' => 'Logout effettuato.']);
}

function check_session() {
    if (is_logged_in()) {
        echo json_encode(['status' => 'success', 'username' => $_SESSION['username'], 'role' => $_SESSION['role']]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Nessuna sessione attiva.']);
    }
}

// --- CHARACTER DATA FUNCTIONS ---
function get_all_characters() {
    $data_dir = get_user_data_dir();
    $characters = [];
    if (!is_dir($data_dir)) {
        echo json_encode([]);
        return;
    }

    $files = glob($data_dir . '*.json');
    foreach ($files as $file) {
        $content = json_decode(file_get_contents($file), true);
        if (isset($content['profile'])) {
            if (!isset($content['profile']['rarity'])) {
                $content['profile']['rarity'] = '5-star';
            }
            $content['profile']['latest_build_stats'] = [];
            if (!empty($content['builds'])) {
                usort($content['builds'], function($a, $b) {
                    return strtotime($b['date']) - strtotime($a['date']);
                });
                $content['profile']['latest_build_stats'] = $content['builds'][0]['stats'];
                $content['profile']['latest_constellation'] = $content['builds'][0]['constellation'];
            } else {
                $content['profile']['latest_constellation'] = $content['profile']['constellation'] ?? 0;
            }
            $characters[] = $content;
        }
    }

    echo json_encode($characters);
}

function get_character() {
    $char_name = $_GET['name'] ?? '';
    if (empty($char_name)) {
        echo json_encode(['status' => 'error', 'message' => 'Nome personaggio non fornito.']);
        http_response_code(400);
        return;
    }
    $user_data_dir = get_user_data_dir();
    $json_file_name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtolower($char_name)) . '.json';
    $file_path = $user_data_dir . $json_file_name;

    if (file_exists($file_path)) {
        $content = json_decode(file_get_contents($file_path), true);
        if (!isset($content['profile']['rarity'])) {
            $content['profile']['rarity'] = '5-star';
            // No need to write back, just for display
        }
        echo json_encode($content);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Personaggio non trovato.']);
        http_response_code(404);
    }
}

function save_character() {
    $user_data_dir = get_user_data_dir();
    if (!is_dir($user_data_dir)) mkdir($user_data_dir, 0777, true);

    $splashart_path = '';
    if (isset($_FILES['splashart']) && $_FILES['splashart']['error'] == 0) {
        $upload_dir = __DIR__ . '/../uploads/';
        $file_extension = pathinfo($_FILES['splashart']['name'], PATHINFO_EXTENSION);
        $safe_char_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($_POST['name']));
        $file_name = $_SESSION['username'] . '_' . $safe_char_name . '.' . $file_extension;
        $target_file = $upload_dir . $file_name;
        if (move_uploaded_file($_FILES['splashart']['tmp_name'], $target_file)) {
            $splashart_path = 'uploads/' . $file_name;
        }
    }

    $ideal_stats = [];
    if(isset($_POST['ideal_stats']) && is_array($_POST['ideal_stats'])){
        foreach($_POST['ideal_stats'] as $stat => $value){
            if(!empty($value)){
                $ideal_stats[$stat] = floatval($value);
            }
        }
    }

    $data = [
        'profile' => [
            'name' => $_POST['name'] ?? '',
            'splashart' => $splashart_path,
            'element' => $_POST['element'] ?? '',
            'role' => $_POST['role'] ?? [],
            'tracked_stats' => $_POST['tracked_stats'] ?? [],
            'ideal_stats' => $ideal_stats,
            'acquisition_date' => $_POST['acquisition_date'] ?? '',
            'constellation' => isset($_POST['constellation']) ? intval($_POST['constellation']) : 0,
            'signature_weapon' => $_POST['signature_weapon'] ?? '',
            'talents' => $_POST['talents'] ?? '',
            'rarity' => $_POST['rarity'] ?? '5-star'
        ],
        'builds' => []
    ];

    $json_file_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($_POST['name'])) . '.json';
    $json_file_path = $user_data_dir . $json_file_name;

    if (file_put_contents($json_file_path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['status' => 'success', 'message' => 'Personaggio salvato con successo']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare il file JSON.']);
    }
}

function update_character() {
    $original_name = $_POST['original_name'] ?? '';
    $new_name = $_POST['name'] ?? '';
    if (empty($original_name) || empty($new_name)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Nome del personaggio mancante.']);
        return;
    }

    $user_data_dir = get_user_data_dir();
    $original_file_path = $user_data_dir . preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($original_name)) . '.json';
    if (!file_exists($original_file_path)) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Personaggio originale non trovato.']);
        return;
    }

    $data = json_decode(file_get_contents($original_file_path), true);

    // aggiorna campi
    $data['profile']['name'] = $new_name;
    $fields = ['element','role','tracked_stats','acquisition_date','signature_weapon','talents','rarity'];
    foreach($fields as $f) {
        if(isset($_POST[$f])) $data['profile'][$f] = $_POST[$f];
    }
    if(isset($_POST['constellation'])) $data['profile']['constellation'] = intval($_POST['constellation']);
    if(isset($_POST['ideal_stats']) && is_array($_POST['ideal_stats'])) {
        $ideal_stats = [];
        foreach($_POST['ideal_stats'] as $stat => $val) if($val !== '') $ideal_stats[$stat] = floatval($val);
        $data['profile']['ideal_stats'] = $ideal_stats;
    }

    if (isset($_FILES['splashart']) && $_FILES['splashart']['error'] == 0) {
        if(!empty($data['profile']['splashart']) && file_exists(__DIR__.'/../'.$data['profile']['splashart'])) unlink(__DIR__.'/../'.$data['profile']['splashart']);
        $upload_dir = __DIR__ . '/../uploads/';
        $file_ext = pathinfo($_FILES['splashart']['name'], PATHINFO_EXTENSION);
        $file_name = $_SESSION['username'].'_'.preg_replace('/[^a-zA-Z0-9_-]/','_',strtolower($new_name)).'.'.$file_ext;
        $target_file = $upload_dir . $file_name;
        if(move_uploaded_file($_FILES['splashart']['tmp_name'], $target_file)) $data['profile']['splashart'] = 'uploads/'.$file_name;
    }

    $new_file_path = $user_data_dir . preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($new_name)) . '.json';

    if ($original_file_path !== $new_file_path && file_put_contents($new_file_path,json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        unlink($original_file_path);
        echo json_encode(['status' => 'success','message'=>'Personaggio aggiornato con successo']);
    } elseif(file_put_contents($original_file_path,json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['status' => 'success','message'=>'Personaggio aggiornato con successo']);
    } else {
        echo json_encode(['status' => 'error','message'=>'Errore salvataggio personaggio.']);
    }
}

// --- BUILD FUNCTIONS ---
function save_build() {
    $char_name = $_POST['character_name'] ?? '';
    if (empty($char_name)) {
        echo json_encode(['status' => 'error', 'message' => 'Nome personaggio non fornito.']);
        http_response_code(400);
        return;
    }

    $user_data_dir = get_user_data_dir();
    $json_file_name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtolower($char_name)) . '.json';
    $file_path = $user_data_dir . $json_file_name;

    if (!file_exists($file_path)) {
        echo json_encode(['status' => 'error', 'message' => 'Personaggio non trovato.']);
        http_response_code(404);
        return;
    }

    $data = json_decode(file_get_contents($file_path), true);

    $new_build = [
        'date' => $_POST['date'] ?? date('Y-m-d'),
        'stats' => $_POST['stats'] ?? [],
        'constellation' => isset($_POST['constellation']) ? intval($_POST['constellation']) : 0,
        'signature_weapon' => $_POST['signature_weapon'] ?? '',
        'talents' => $_POST['talents'] ?? ''
    ];

    // Se la nuova costellazione è maggiore, aggiorna anche il profilo
    if ($new_build['constellation'] > $data['profile']['constellation']) {
        $data['profile']['constellation'] = $new_build['constellation'];
    }

    // Definisci la gerarchia per talenti e signature
    $talents_rank = ['No' => 0, 'Vicino' => 1, 'Sì' => 2];
    $signature_rank = ['No' => 0, 'Buona' => 1, 'Sì' => 2];

    // Aggiorna i talenti se il rank è maggiore
    $new_talents_rank = $talents_rank[$new_build['talents']] ?? -1;
    $profile_talents_rank = $talents_rank[$data['profile']['talents']] ?? -1;
    if ($new_talents_rank > $profile_talents_rank) {
        $data['profile']['talents'] = $new_build['talents'];
    }

    // Aggiorna la signature se il rank è maggiore
    $new_signature_rank = $signature_rank[$new_build['signature_weapon']] ?? -1;
    $profile_signature_rank = $signature_rank[$data['profile']['signature_weapon']] ?? -1;
    if ($new_signature_rank > $profile_signature_rank) {
        $data['profile']['signature_weapon'] = $new_build['signature_weapon'];
    }

    array_unshift($data['builds'], $new_build);

    if (file_put_contents($file_path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['status' => 'success', 'message' => 'Build salvata con successo']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare il file JSON.']);
        http_response_code(500);
    }
}

function delete_build() {
    $char_name = $_POST['character_name'] ?? '';
    $build_index = $_POST['build_index'] ?? -1;

    if (empty($char_name) || $build_index < 0) {
        echo json_encode(['status' => 'error', 'message' => 'Dati mancanti per la cancellazione.']);
        http_response_code(400);
        return;
    }

    $user_data_dir = get_user_data_dir();
    $json_file_name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtolower($char_name)) . '.json';
    $file_path = $user_data_dir . $json_file_name;

    if (!file_exists($file_path)) {
        echo json_encode(['status' => 'error', 'message' => 'Personaggio non trovato.']);
        http_response_code(404);
        return;
    }

    $data = json_decode(file_get_contents($file_path), true);

    if (!isset($data['builds'][$build_index])) {
        echo json_encode(['status' => 'error', 'message' => 'Build non trovata.']);
        http_response_code(404);
        return;
    }

    array_splice($data['builds'], $build_index, 1);

    if (file_put_contents($file_path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['status' => 'success', 'message' => 'Build cancellata con successo']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare il file JSON.']);
        http_response_code(500);
    }
}

function update_build() {
    $char_name = $_POST['character_name'] ?? '';
    $build_index = $_POST['build_index'] ?? -1;

    if (empty($char_name) || $build_index < 0) {
        echo json_encode(['status' => 'error', 'message' => 'Dati mancanti per la modifica.']);
        http_response_code(400);
        return;
    }

    $user_data_dir = get_user_data_dir();
    $json_file_name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtolower($char_name)) . '.json';
    $file_path = $user_data_dir . $json_file_name;

    if (!file_exists($file_path)) {
        echo json_encode(['status' => 'error', 'message' => 'Personaggio non trovato.']);
        http_response_code(404);
        return;
    }

    $data = json_decode(file_get_contents($file_path), true);

    if (!isset($data['builds'][$build_index])) {
        echo json_encode(['status' => 'error', 'message' => 'Build non trovata.']);
        http_response_code(404);
        return;
    }

    // Crea la build aggiornata con i nuovi dati
    $updated_build = [
        'date' => $_POST['date'] ?? date('Y-m-d'),
        'stats' => $_POST['stats'] ?? [],
        'constellation' => isset($_POST['constellation']) ? intval($_POST['constellation']) : 0,
        'signature_weapon' => $_POST['signature_weapon'] ?? '',
        'talents' => $_POST['talents'] ?? ''
    ];

    // Sostituisci la vecchia build con quella aggiornata
    $data['builds'][$build_index] = $updated_build;

    if (file_put_contents($file_path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['status' => 'success', 'message' => 'Build aggiornata con successo']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare il file JSON.']);
        http_response_code(500);
    }
}

// --- ADMIN FUNCTIONS ---
function get_all_users() {
    $users_file = get_users_file();
    if (!file_exists($users_file)) {
        echo json_encode([]);
        return;
    }
    echo json_encode(json_decode(file_get_contents($users_file), true));
}

function update_user() {
    $users_file = get_users_file();
    $users = json_decode(file_get_contents($users_file), true);

    $username_to_update = $_POST['username'] ?? '';
    $new_role = $_POST['role'] ?? '';
    $new_password = $_POST['password'] ?? '';
    $avatar_path = ''; // Initialize avatar path

    foreach ($users as &$user) {
        if ($user['username'] === $username_to_update) {
            $user['role'] = $new_role;
            if (!empty($new_password)) {
                $user['passwordHash'] = password_hash($new_password, PASSWORD_DEFAULT);
            }

            // Handle avatar upload
            if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] == 0) {
                $upload_dir = __DIR__ . '/../uploads/';
                if (!is_dir($upload_dir)) {
                    mkdir($upload_dir, 0777, true);
                }

                // Delete old avatar if exists
                if (!empty($user['avatar']) && file_exists(__DIR__ . '/../' . $user['avatar'])) {
                    unlink(__DIR__ . '/../' . $user['avatar']);
                }

                $file_extension = pathinfo($_FILES['avatar']['name'], PATHINFO_EXTENSION);
                $safe_username = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($username_to_update));
                $file_name = $safe_username . '_avatar.' . $file_extension;
                $target_file = $upload_dir . $file_name;

                if (move_uploaded_file($_FILES['avatar']['tmp_name'], $target_file)) {
                    $user['avatar'] = 'uploads/' . $file_name;
                }
            } else if (isset($_POST['avatar_removed']) && $_POST['avatar_removed'] === 'true') {
                // If avatar was explicitly removed from frontend
                if (!empty($user['avatar']) && file_exists(__DIR__ . '/../' . $user['avatar'])) {
                    unlink(__DIR__ . '/../' . $user['avatar']);
                }
                $user['avatar'] = ''; // Clear avatar path
            }
            break;
        }
    }
    file_put_contents($users_file, json_encode($users, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'message' => 'Utente aggiornato con successo.']);
}

function delete_users() {
    $users_file = get_users_file();
    $users = json_decode(file_get_contents($users_file), true);

    $username_to_delete = $_POST['username'] ?? '';

    $users = array_filter($users, function($user) use ($username_to_delete) {
        return $user['username'] !== $username_to_delete;
    });

    file_put_contents($users_file, json_encode(array_values($users), JSON_PRETTY_PRINT)); // re-index array
    echo json_encode(['status' => 'success', 'message' => 'Utente eliminato con successo.']);
}

function register() {
    $users_file = get_users_file();
    $users = file_exists($users_file) ? json_decode(file_get_contents($users_file), true) : [];

    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $role = $_POST['role'] ?? 'user'; // Default role

    if (empty($username) || empty($password)) {
        echo json_encode(['status' => 'error', 'message' => 'Username e password sono obbligatori.']);
        return;
    }

    foreach ($users as $user) {
        if ($user['username'] === $username) {
            echo json_encode(['status' => 'error', 'message' => 'Username già esistente.']);
            return;
        }
    }

    $users[] = [
        'username' => $username,
        'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
        'role' => $role
    ];

    file_put_contents($users_file, json_encode($users, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'message' => 'Registrazione avvenuta con successo.']);
}


// --- ROUTER ---
$action = $_REQUEST['action'] ?? '';

$public_actions = ['login','logout','check_session', 'register']; // Added register to public actions
$user_actions   = ['get_all_characters','save_character','update_character','get_character','save_build','update_build','delete_build'];
$admin_actions  = ['get_all_users','update_user','delete_users'];

if(in_array($action,$public_actions)) {
    $action();
} elseif(in_array($action,$user_actions)) {
    if(!is_logged_in()){ http_response_code(401); echo json_encode(['status'=>'error','message'=>'Accesso non effettuato.']); exit; }
    $action();
} elseif(in_array($action,$admin_actions)) {
    if(!is_admin()){ http_response_code(403); echo json_encode(['status'=>'error','message'=>'Accesso negato.']); exit; }
    $action();
} else {
    http_response_code(400);
    echo json_encode(['status'=>'error','message'=>'Azione non valida.']);
}