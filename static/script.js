document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    const themeToggle = document.getElementById('theme-toggle');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const autoplayAudioToggle = document.getElementById('autoplay-audio-toggle');
    const html = document.documentElement;
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebar = document.getElementById('sidebar');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const saveSettings = document.getElementById('save-settings');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatArea = document.getElementById('chat-area');
    const chatMessages = document.getElementById('chat-messages');
    const newChatBtn = document.getElementById('new-chat');
    const modelSelect = document.getElementById('model-select');
    const imageUploadBtn = document.getElementById('image-upload-btn');
    const imageFileInput = document.getElementById('image-file-input');
    const imagePreviewWrapper = document.getElementById('image-preview-wrapper');
    const helpBtn = document.getElementById('help-btn');

    // --- State ---
    let currentImageBase64 = null;
    let isBotTyping = false;

    // --- Initialization ---
    initializeTheme();
    initializeModels();
    setupEventListeners();
    adjustTextareaHeight();

    // --- Functions ---

    // Theme Handling
    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        const savedAutoplay = localStorage.getItem('autoplayAudio') !== 'false';

        if (savedTheme === 'dark') {
            html.classList.add('dark');
            darkModeToggle.checked = true;
            themeToggle.querySelector('span').textContent = 'الوضع النهاري';
            themeToggle.querySelector('i').className = 'fas fa-sun';
        } else {
            html.classList.remove('dark');
            darkModeToggle.checked = false;
            themeToggle.querySelector('span').textContent = 'الوضع الليلي';
            themeToggle.querySelector('i').className = 'fas fa-moon';
        }
        autoplayAudioToggle.checked = savedAutoplay;
    }

    function toggleTheme() {
        const isDark = html.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        darkModeToggle.checked = isDark;
        if (isDark) {
            themeToggle.querySelector('span').textContent = 'الوضع النهاري';
            themeToggle.querySelector('i').className = 'fas fa-sun';
        } else {
            themeToggle.querySelector('span').textContent = 'الوضع الليلي';
            themeToggle.querySelector('i').className = 'fas fa-moon';
        }
    }

    // Model Loading
    async function initializeModels() {
        try {
            const response = await fetch('/api/models');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            modelSelect.innerHTML = '';
            if (data.models && data.models.length > 0) {
                const preferredModels = ['llama3:latest', 'mistral:latest'];
                let selectedModel = data.models[0];
                for(const pref of preferredModels) {
                    if (data.models.includes(pref)) {
                        selectedModel = pref;
                        break;
                    }
                }

                data.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model;
                    option.textContent = model;
                    if (model === selectedModel) {
                        option.selected = true;
                    }
                    modelSelect.appendChild(option);
                });
                enableInput();
            } else {
                showError("لم يتم العثور على نماذج. تأكد من أن خدمة Ollama تعمل وبها نماذج محملة.");
                disableInput();
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            showError(`خطأ في تحميل النماذج: ${error.message}. حاول تحديث الصفحة.`);
            modelSelect.innerHTML = '<option value="">خطأ</option>';
            disableInput();
        }
    }

    // UI Event Listeners
    function setupEventListeners() {
        sidebarToggle.addEventListener('click', () => sidebar.classList.remove('-translate-x-full'));
        sidebarClose.addEventListener('click', () => sidebar.classList.add('-translate-x-full'));

        settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
        closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
        saveSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));

        messageInput.addEventListener('input', () => {
            adjustTextareaHeight();
            sendButton.disabled = messageInput.value.trim() === '' || isBotTyping;
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendButton.disabled) {
                    handleSendMessage();
                }
            }
        });

        sendButton.addEventListener('click', handleSendMessage);

        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const suggestionText = btn.textContent.trim().replace(/^"|"$/g, '');
                messageInput.value = suggestionText;
                adjustTextareaHeight();
                sendButton.disabled = false;
                messageInput.focus();
            });
        });

        newChatBtn.addEventListener('click', () => {
            if (confirm('هل تريد بدء محادثة جديدة؟ سيتم مسح سجل المحادثة الحالية والصورة المرفقة.')) {
                chatMessages.innerHTML = '';
                addWelcomeMessage();
                clearImagePreview();
                messageInput.value = '';
                adjustTextareaHeight();
                sendButton.disabled = true;
            }
        });

        imageUploadBtn.addEventListener('click', () => imageFileInput.click());
        imageFileInput.addEventListener('change', handleImageFileSelect);

        helpBtn.addEventListener('click', () => {
            alert("روبوت حسام هو مساعد ذكاء اصطناعي يمكنه الإجابة على أسئلتك، المساعدة في الكتابة، البرمجة، والمزيد.\n\n" +
                  "- اكتب رسالتك في الصندوق بالأسفل واضغط إرسال.\n" +
                  "- يمكنك تحميل صورة باستخدام أيقونة الصورة (للنماذج التي تدعم الصور مثل llava).\n" +
                  "- اختر النموذج المفضل لديك من القائمة المنسدلة.\n" +
                  "- استخدم الإعدادات لتغيير المظهر (الوضع الليلي) والتحكم في تشغيل الصوت.\n" +
                  "- ابدأ محادثة جديدة لمسح السجل الحالي.\n\n" +
                  "تذكر: قد تكون الردود غير دقيقة أحيانًا، تحقق من المعلومات الهامة.");
        });

        darkModeToggle.addEventListener('change', toggleTheme);
        themeToggle.addEventListener('click', toggleTheme);
        autoplayAudioToggle.addEventListener('change', () => {
            localStorage.setItem('autoplayAudio', autoplayAudioToggle.checked);
        });
    }

    function adjustTextareaHeight() {
        messageInput.style.height = 'auto';
        const scrollHeight = messageInput.scrollHeight;
        const maxHeight = 150;
        messageInput.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
        messageInput.style.overflowY = scrollHeight > maxHeight ? 'scroll' : 'hidden';
    }

    // Input Controls
    function disableInput() {
        messageInput.disabled = true;
        sendButton.disabled = true;
        imageUploadBtn.disabled = true;
        modelSelect.disabled = true;
        messageInput.placeholder = "الخدمة غير متاحة حالياً...";
    }

    function enableInput() {
        messageInput.disabled = false;
        sendButton.disabled = messageInput.value.trim() === '';
        imageUploadBtn.disabled = false;
        modelSelect.disabled = false;
        messageInput.placeholder = "اكتب رسالتك هنا...";
    }

    // Image Handling
    function handleImageFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                currentImageBase64 = reader.result.split(',')[1];
                displayImagePreview(reader.result);
            }
            reader.readAsDataURL(file);
        }
        imageFileInput.value = '';
    }

    function displayImagePreview(imageDataUrl) {
        imagePreviewWrapper.innerHTML = '';
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-preview-container';

        const img = document.createElement('img');
        img.src = imageDataUrl;
        img.className = 'image-preview';
        img.alt = 'معاينة الصورة';

        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '×';
        removeBtn.className = 'remove-image-btn';
        removeBtn.title = 'إزالة الصورة';
        removeBtn.onclick = clearImagePreview;

        previewContainer.appendChild(img);
        previewContainer.appendChild(removeBtn);
        imagePreviewWrapper.appendChild(previewContainer);
    }

    function clearImagePreview() {
        currentImageBase64 = null;
        imagePreviewWrapper.innerHTML = '';
    }

    // Chat Messaging
    function addWelcomeMessage() {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'message-enter bg-white dark:bg-gray-800 rounded-xl shadow p-4';
        welcomeDiv.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                    <i class="fas fa-robot"></i>
                </div>
                <div>
                    <h3 class="font-bold text-gray-800 dark:text-white">مرحباً مجدداً!</h3>
                    <p class="text-gray-600 dark:text-gray-300 mt-1 text-sm">
                        كيف يمكنني مساعدتك الآن؟
                    </p>
                </div>
            </div>
        `;
        chatMessages.appendChild(welcomeDiv);
        scrollToBottom();
    }

    function handleSendMessage() {
        const message = messageInput.value.trim();
        const selectedModel = modelSelect.value;

        if (message === '' || !selectedModel || isBotTyping) return;

        isBotTyping = true;
        sendButton.disabled = true;
        messageInput.disabled = true;

        addMessageToChat('user', message, currentImageBase64 ? getImagePreviewHtml() : null);

        messageInput.value = '';
        adjustTextareaHeight();
        const imageToSend = currentImageBase64;
        clearImagePreview();

        const typingIndicator = showTypingIndicator();
        scrollToBottom();

        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                model: selectedModel,
                image_base64: imageToSend
            }),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => {
                    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
                }).catch(() => {
                    throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            typingIndicator.remove();
            if (data.error) {
                showError(data.error);
            } else {
                addMessageToChat('assistant', data.text, null, data.audio_url);
            }
        })
        .catch(error => {
            console.error('Error sending message:', error);
            typingIndicator.remove();
            showError(`حدث خطأ أثناء الاتصال بالخادم: ${error.message}`);
        })
        .finally(() => {
            isBotTyping = false;
            messageInput.disabled = false;
            sendButton.disabled = messageInput.value.trim() === '';
        });
    }

    function addMessageToChat(sender, message, imagePreviewHtml = null, audioUrl = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-enter max-w-none md:max-w-2xl lg:max-w-3xl mx-auto';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'bg-white dark:bg-gray-800 rounded-xl shadow p-4';

        let htmlContent = '';
        let iconClass = sender === 'user' ? 'fa-user' : 'fa-robot';
        let avatarBg = sender === 'user' ? 'bg-gray-500' : 'bg-blue-500';
        let textColor = 'text-gray-800 dark:text-white';

        const imagePart = imagePreviewHtml ? `<div class="mb-2">${imagePreviewHtml}</div>` : '';

        htmlContent = `
            <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center text-white flex-shrink-0">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    ${imagePart}
                    <p class="${textColor} whitespace-pre-wrap break-words">${escapeHtml(message)}</p>
        `;

        if (sender === 'assistant') {
            htmlContent += `
                    <div class="mt-3 flex items-center gap-3 text-sm">
                        <button class="copy-btn text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition" title="نسخ النص">
                            <i class="fas fa-copy"></i>
                        </button>
            `;
            if (audioUrl) {
                htmlContent += `
                    <button class="play-audio-btn text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition" data-audio-url="${audioUrl}" title="تشغيل الصوت">
                        <i class="fas fa-volume-up"></i>
                    </button>
                    <audio class="audio-player hidden" src="${audioUrl}" preload="none"></audio>
                `;
            }
            htmlContent += `
                    </div>
                `;

            if (audioUrl && autoplayAudioToggle.checked) {
                setTimeout(() => {
                    const player = messageDiv.querySelector('.audio-player');
                    if (player) player.play().catch(e => console.warn("Audio autoplay failed:", e));
                }, 100);
            }
        }

        htmlContent += `
                </div>
            </div>
        `;

        contentDiv.innerHTML = htmlContent;
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        scrollToBottom();

        addMessageButtonListeners(messageDiv);
    }

    function addMessageButtonListeners(messageElement) {
        const copyBtn = messageElement.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const textToCopy = messageElement.querySelector('p').textContent;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const icon = copyBtn.querySelector('i');
                    icon.className = 'fas fa-check text-green-500';
                    setTimeout(() => { icon.className = 'fas fa-copy'; }, 1500);
                }).catch(err => console.error('Failed to copy text: ', err));
            });
        }

        const playAudioBtn = messageElement.querySelector('.play-audio-btn');
        if (playAudioBtn) {
            const audioPlayer = messageElement.querySelector('.audio-player');
            if (audioPlayer) {
                playAudioBtn.addEventListener('click', () => {
                    document.querySelectorAll('audio.audio-player').forEach(player => {
                        if (player !== audioPlayer && !player.paused) {
                            player.pause();
                            player.currentTime = 0;
                            const otherBtn = player.previousElementSibling;
                            if (otherBtn && otherBtn.classList.contains('play-audio-btn')) {
                                otherBtn.querySelector('i').className = 'fas fa-volume-up';
                            }
                        }
                    });

                    if (audioPlayer.paused) {
                        audioPlayer.play().catch(e => console.error("Audio play failed:", e));
                        playAudioBtn.querySelector('i').className = 'fas fa-pause text-blue-500';
                    } else {
                        audioPlayer.pause();
                        playAudioBtn.querySelector('i').className = 'fas fa-volume-up';
                    }
                });

                audioPlayer.addEventListener('ended', () => {
                    playAudioBtn.querySelector('i').className = 'fas fa-volume-up';
                });
                audioPlayer.addEventListener('pause', () => {
                    if (audioPlayer.currentTime !== audioPlayer.duration) {
                        playAudioBtn.querySelector('i').className = 'fas fa-volume-up';
                    }
                });
            }
        }
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message-enter max-w-none md:max-w-2xl lg:max-w-3xl mx-auto';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="typing-indicator text-gray-600 dark:text-gray-300 pt-2">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        scrollToBottom();
        return typingDiv;
    }

    function showError(errorMessage) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message-enter max-w-none md:max-w-2xl lg:max-w-3xl mx-auto';
        errorDiv.innerHTML = `
            <div class="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 dark:border-red-400 text-red-700 dark:text-red-200 p-4 rounded-lg shadow" role="alert">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white flex-shrink-0">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div>
                        <p class="font-bold">خطأ</p>
                        <p class="text-sm">${escapeHtml(errorMessage)}</p>
                    </div>
                </div>
            </div>
        `;
        chatMessages.appendChild(errorDiv);
        scrollToBottom();
    }

    // Utility Functions
    function scrollToBottom() {
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getImagePreviewHtml() {
        const previewContainer = imagePreviewWrapper.querySelector('.image-preview-container');
        if (previewContainer) {
            const img = previewContainer.querySelector('img');
            if(img){
                return `<img src="${img.src}" alt="مرفق صورة" class="max-w-[80px] max-h-[80px] rounded border border-gray-300 dark:border-gray-600">`;
            }
        }
        return '';
    }
});