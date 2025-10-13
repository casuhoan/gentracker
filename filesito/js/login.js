document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const migrateBtn = document.getElementById('migrate-btn');

    const showError = (message) => {
        Swal.fire({
            icon: 'error',
            title: 'Errore di Login',
            text: message,
        });
    };

    // Listener for the migration button
    if (migrateBtn) {
        migrateBtn.addEventListener('click', () => {
            Swal.fire({
                title: 'Sei assolutamente sicuro?',
                text: "Questa azione avvierà la migrazione dei dati degli utenti. È un'operazione da eseguire UNA SOLA VOLTA. Non ricaricare la pagina durante il processo.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonText: 'Annulla',
                confirmButtonText: 'Sì, avvia la migrazione!'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    // Show a loading indicator
                    Swal.fire({
                        title: 'Migrazione in corso...',
                        text: 'Attendere prego. Questa operazione potrebbe richiedere alcuni istanti.',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    try {
                        // Call the migration script
                        const response = await fetch('migrazione.php');
                        const output = await response.text();

                        // Display the result
                        Swal.fire({
                            title: 'Risultato Migrazione',
                            html: `<pre style="text-align: left; white-space: pre-wrap;">${output}</pre>`,
                            icon: 'info',
                            width: '800px'
                        });

                    } catch (error) {
                        Swal.fire({
                            title: 'Errore',
                            text: 'Impossibile eseguire lo script di migrazione. Controlla la console del browser per i dettagli.',
                            icon: 'error'
                        });
                        console.error('Errore durante la migrazione:', error);
                    }
                }
            });
        });
    }

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
