// login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    const showError = (message) => {
        Swal.fire({
            icon: 'error',
            title: 'Errore di Login',
            text: message,
        });
    };

    // Listener del form di login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Previene il submit normale

        const formData = new FormData(loginForm);
        formData.append('action', 'login');

        try {
            // Effettua la richiesta al server
            const response = await fetch('php/api.php', {
                method: 'POST',
                body: formData
            });

            // Converte la risposta in JSON
            const result = await response.json();

            if (result.status === 'success') {
                // Login riuscito, reindirizza alla home
                window.location.href = 'index.html';
            } else {
                // Mostra errore
                showError(result.message || 'Credenziali non valide.');
            }
        } catch (error) {
            console.error('Errore nella richiesta di login:', error);
            showError('Impossibile comunicare con il server.');
        }
    });
});
