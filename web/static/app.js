class DriveGramApp {
    constructor() {
        this.token = localStorage.getItem('drivegram_token');
        this.user = null;
        this.currentFolder = null;
        this.folders = [];
        this.files = [];
        this.isDarkMode = false;
        
        this.init();
    }

    init() {
        if (this.token) {
            this.showMainApp();
            this.loadUser();
            this.loadFiles();
        } else {
            this.showLoginScreen();
        }
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login forms
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('verifyForm').addEventListener('submit', (e) => this.handleVerifyOTP(e));
        
        // Main app
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('uploadBtn').addEventListener('click', () => this.showUploadModal());
        document.getElementById('newFolderBtn').addEventListener('click', () => this.showFolderModal());
        document.getElementById('searchBtn').addEventListener('click', () => this.toggleSearch());
        document.getElementById('closeSearchBtn').addEventListener('click', () => this.toggleSearch());
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('darkModeBtn').addEventListener('click', () => this.toggleDarkMode());
        
        // User menu
        document.getElementById('userMenuBtn').addEventListener('click', () => this.toggleUserMenu());
        
        // Modals
        document.getElementById('cancelUploadBtn').addEventListener('click', () => this.hideUploadModal());
        document.getElementById('cancelFolderBtn').addEventListener('click', () => this.hideFolderModal());
        document.getElementById('createFolderBtn').addEventListener('click', () => this.createFolder());
        
        // File inputs
        document.getElementById('modalFileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        this.setupDragAndDrop();
        
        // Close modals on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.remove('hidden');
            dropZone.classList.add('dragover');
        });
        
        document.addEventListener('dragleave', (e) => {
            if (e.target === dropZone || !dropZone.contains(e.relatedTarget)) {
                dropZone.classList.add('hidden');
                dropZone.classList.remove('dragover');
            }
        });
        
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.add('hidden');
            dropZone.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            this.uploadFiles(files);
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        const phoneNumber = document.getElementById('phoneNumber').value;
        
        try {
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phoneNumber })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Show verification form (mock - in real implementation, you'd handle the actual OTP)
                document.getElementById('loginForm').classList.add('hidden');
                document.getElementById('verifyForm').classList.remove('hidden');
                this.showNotification('Verification code sent! Use "12345" for demo', 'success');
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Network error. Please try again.');
        }
    }

    async handleVerifyOTP(e) {
        e.preventDefault();
        const phoneNumber = document.getElementById('phoneNumber').value;
        const code = document.getElementById('verificationCode').value;
        
        try {
            const response = await fetch('/api/v1/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    phone_number: phoneNumber,
                    code: code,
                    phone_code_hash: 'mock_hash_' + phoneNumber
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('drivegram_token', this.token);
                this.showMainApp();
                this.loadUser();
                this.loadFiles();
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Network error. Please try again.');
        }
    }

    async loadUser() {
        try {
            const response = await this.apiCall('/api/v1/auth/me');
            if (response.ok) {
                const user = await response.json();
                this.user = user;
                document.getElementById('username').textContent = user.username || user.first_name;
            }
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    }

    async loadFiles() {
        try {
            const url = this.currentFolder ? 
                `/api/v1/files?folder_id=${this.currentFolder}` : 
                '/api/v1/files';
            
            const response = await this.apiCall(url);
            if (response.ok) {
                const data = await response.json();
                this.files = data.files || [];
                this.folders = data.folders || [];
                this.renderFiles();
            }
        } catch (error) {
            console.error('Failed to load files:', error);
        }
    }

    renderFiles() {
        const filesGrid = document.getElementById('filesGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (this.files.length === 0 && this.folders.length === 0) {
            filesGrid.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        let html = '';
        
        // Render folders
        this.folders.forEach(folder => {
            html += this.createFolderElement(folder);
        });
        
        // Render files
        this.files.forEach(file => {
            html += this.createFileElement(file);
        });
        
        filesGrid.innerHTML = html;
        
        // Add click handlers
        this.attachFileEventHandlers();
    }

    createFolderElement(folder) {
        return `
            <div class="file-item bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50" 
                 data-type="folder" data-id="${folder.id}">
                <div class="text-center">
                    <i class="fas fa-folder text-4xl text-blue-500 mb-2"></i>
                    <p class="text-sm font-medium text-gray-700 truncate">${folder.name}</p>
                    <p class="text-xs text-gray-500">Folder</p>
                </div>
            </div>
        `;
    }

    createFileElement(file) {
        const icon = this.getFileIcon(file.mime_type);
        const size = this.formatFileSize(file.size);
        
        return `
            <div class="file-item bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50" 
                 data-type="file" data-id="${file.id}">
                <div class="text-center">
                    <i class="${icon} text-4xl mb-2 ${this.getFileIconColor(file.mime_type)}"></i>
                    <p class="text-sm font-medium text-gray-700 truncate">${file.name}</p>
                    <p class="text-xs text-gray-500">${size}</p>
                </div>
                <div class="mt-2 flex justify-center space-x-1 opacity-0 hover:opacity-100 transition-opacity">
                    <button class="download-btn p-1 text-blue-500 hover:text-blue-700" data-id="${file.id}">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="delete-btn p-1 text-red-500 hover:text-red-700" data-id="${file.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    attachFileEventHandlers() {
        // Folder clicks
        document.querySelectorAll('[data-type="folder"]').forEach(element => {
            element.addEventListener('click', () => {
                const folderId = element.dataset.id;
                this.openFolder(folderId);
            });
        });
        
        // File downloads
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = btn.dataset.id;
                this.downloadFile(fileId);
            });
        });
        
        // File deletions
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = btn.dataset.id;
                this.deleteFile(fileId);
            });
        });
    }

    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return 'fas fa-image';
        if (mimeType.startsWith('video/')) return 'fas fa-video';
        if (mimeType.startsWith('audio/')) return 'fas fa-music';
        if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
        if (mimeType.includes('document') || mimeType.includes('word')) return 'fas fa-file-word';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'fas fa-file-excel';
        if (mimeType.includes('zip') || mimeType.includes('rar')) return 'fas fa-file-archive';
        return 'fas fa-file';
    }

    getFileIconColor(mimeType) {
        if (mimeType.startsWith('image/')) return 'text-green-500';
        if (mimeType.startsWith('video/')) return 'text-purple-500';
        if (mimeType.startsWith('audio/')) return 'text-pink-500';
        if (mimeType.includes('pdf')) return 'text-red-500';
        if (mimeType.includes('document') || mimeType.includes('word')) return 'text-blue-500';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'text-green-500';
        if (mimeType.includes('zip') || mimeType.includes('rar')) return 'text-yellow-500';
        return 'text-gray-500';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    openFolder(folderId) {
        this.currentFolder = folderId;
        this.loadFiles();
        this.updateBreadcrumb();
        
        // Enable back button
        document.getElementById('backBtn').disabled = false;
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        // Simplified breadcrumb - in real implementation, you'd track the full path
        if (this.currentFolder) {
            const folder = this.folders.find(f => f.id == this.currentFolder);
            if (folder) {
                breadcrumb.innerHTML = `
                    <span class="breadcrumb-item cursor-pointer hover:text-blue-500" data-path="">
                        <i class="fas fa-home mr-1"></i>Home
                    </span>
                    <span class="breadcrumb-item">${folder.name}</span>
                `;
            }
        } else {
            breadcrumb.innerHTML = `
                <span class="breadcrumb-item cursor-pointer hover:text-blue-500" data-path="">
                    <i class="fas fa-home mr-1"></i>Home
                </span>
            `;
        }
        
        // Add click handlers to breadcrumb
        breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
            item.addEventListener('click', () => {
                const path = item.dataset.path;
                if (path === '') {
                    this.currentFolder = null;
                    this.loadFiles();
                    this.updateBreadcrumb();
                    document.getElementById('backBtn').disabled = true;
                }
            });
        });
    }

    async handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.uploadFiles(files);
    }

    async uploadFiles(files) {
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            if (this.currentFolder) {
                formData.append('folder_id', this.currentFolder);
            }
            
            try {
                const response = await this.apiCall('/api/v1/files/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    this.showNotification(`${file.name} uploaded successfully`, 'success');
                    this.loadFiles();
                } else {
                    const error = await response.json();
                    this.showError(`Failed to upload ${file.name}: ${error.error}`);
                }
            } catch (error) {
                this.showError(`Failed to upload ${file.name}: Network error`);
            }
        }
        
        this.hideUploadModal();
    }

    async downloadFile(fileId) {
        try {
            const response = await this.apiCall(`/api/v1/files/${fileId}/download`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'download';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            this.showError('Failed to download file');
        }
    }

    async deleteFile(fileId) {
        if (!confirm('Are you sure you want to delete this file?')) return;
        
        try {
            const response = await this.apiCall(`/api/v1/files/${fileId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showNotification('File deleted successfully', 'success');
                this.loadFiles();
            } else {
                const error = await response.json();
                this.showError(`Failed to delete file: ${error.error}`);
            }
        } catch (error) {
            this.showError('Failed to delete file');
        }
    }

    async createFolder() {
        const folderName = document.getElementById('folderNameInput').value.trim();
        if (!folderName) return;
        
        try {
            const response = await this.apiCall('/api/v1/files/mkdir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: folderName,
                    parent_id: this.currentFolder
                })
            });
            
            if (response.ok) {
                this.showNotification('Folder created successfully', 'success');
                this.loadFiles();
                this.hideFolderModal();
            } else {
                const error = await response.json();
                this.showError(`Failed to create folder: ${error.error}`);
            }
        } catch (error) {
            this.showError('Failed to create folder');
        }
    }

    async handleSearch(e) {
        const query = e.target.value.trim();
        if (query.length < 2) {
            this.loadFiles();
            return;
        }
        
        try {
            const response = await this.apiCall(`/api/v1/search?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                this.files = data.files || [];
                this.folders = []; // Don't show folders in search
                this.renderFiles();
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    toggleSearch() {
        const searchBar = document.getElementById('searchBar');
        searchBar.classList.toggle('hidden');
        if (!searchBar.classList.contains('hidden')) {
            document.getElementById('searchInput').focus();
        } else {
            document.getElementById('searchInput').value = '';
            this.loadFiles();
        }
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark-mode');
        const icon = document.querySelector('#darkModeBtn i');
        icon.classList.toggle('fa-moon');
        icon.classList.toggle('fa-sun');
    }

    toggleUserMenu() {
        const menu = document.getElementById('userMenu');
        menu.classList.toggle('hidden');
    }

    showUploadModal() {
        document.getElementById('uploadModal').classList.add('show');
    }

    hideUploadModal() {
        document.getElementById('uploadModal').classList.remove('show');
    }

    showFolderModal() {
        document.getElementById('folderModal').classList.add('show');
        document.getElementById('folderNameInput').value = '';
        document.getElementById('folderNameInput').focus();
    }

    hideFolderModal() {
        document.getElementById('folderModal').classList.remove('show');
    }

    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
    }

    showError(message) {
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        setTimeout(() => errorDiv.classList.add('hidden'), 5000);
    }

    showNotification(message, type = 'info') {
        // Create a simple notification (you could enhance this with a proper toast library)
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' : 
            type === 'error' ? 'bg-red-500 text-white' : 
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async apiCall(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                ...options.headers
            }
        };
        
        return fetch(url, { ...defaultOptions, ...options });
    }

    logout() {
        localStorage.removeItem('drivegram_token');
        this.token = null;
        this.user = null;
        this.showLoginScreen();
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('verifyForm').classList.add('hidden');
        document.getElementById('phoneNumber').value = '';
        document.getElementById('verificationCode').value = '';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DriveGramApp();
});

// Handle back button
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('backBtn').addEventListener('click', () => {
        const app = window.drivegramApp;
        if (app) {
            app.currentFolder = null;
            app.loadFiles();
            app.updateBreadcrumb();
            document.getElementById('backBtn').disabled = true;
        }
    });
});
