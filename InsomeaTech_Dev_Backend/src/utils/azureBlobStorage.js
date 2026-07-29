const azure = require('azure-storage');
const winston = require('winston');

// Create logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/azureStorage.log' })
    ]
});

class AzureBlobStorage {
    constructor() {
        // Use environment variables for Azure Storage configuration
        this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        this.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'orders';
        
        if (!this.accountName || !this.accountKey) {
            logger.error('Azure Storage credentials not configured in environment variables');
            throw new Error('Azure Storage credentials missing in environment variables');
        }
        
        // Azure connection strings and raw account keys use different client factories.
        if (this.accountKey.includes('AccountName=') && this.accountKey.includes('AccountKey=')) {
            this.blobService = azure.createBlobService(this.accountKey);
        } else {
            this.blobService = azure.createBlobService(
                this.accountName,
                this.accountKey
            );
        }
        
        this.setupContainer();
    }

    async setupContainer() {
        try {
            await new Promise((resolve, reject) => {
                this.blobService.createContainerIfNotExists(this.containerName, { 
                    publicAccessLevel: 'blob' 
                }, (error, result, response) => {
                    if (error) {
                        logger.error('Error creating container:', error);
                        reject(error);
                    } else {
                        logger.info('Container setup completed:', this.containerName);
                        logger.info('Container URL:', `https://${this.accountName}.blob.core.windows.net/${this.containerName}`);
                        resolve(result);
                    }
                });
            });
        } catch (error) {
            logger.error('Container setup failed:', error);
            throw error;
        }
    }

    async uploadFile(orderId, fileType, fileBuffer, fileName) {
        try {
            const blobName = `${orderId}-${fileType}-${Date.now()}-${fileName}`;
            
            return new Promise((resolve, reject) => {
                this.blobService.createBlockBlobFromText(
                    this.containerName,
                    blobName,
                    fileBuffer,
                    { 
                        contentSettings: { 
                            contentType: this.getContentType(fileName),
                            contentDisposition: `attachment; filename="${fileName}"`
                        } 
                    },
                    (error, result, response) => {
                        if (error) {
                            logger.error('Error uploading file:', error);
                            reject(error);
                        } else {
                            // Generate the full URL with the blob name
                            const fileUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}`;
                            logger.info('File uploaded successfully:', fileUrl);
                            resolve(fileUrl);
                        }
                    }
                );
            });
        } catch (error) {
            logger.error('Upload file error:', error);
            throw error;
        }
    }

    async downloadFile(blobName) {
        try {
            return new Promise((resolve, reject) => {
                this.blobService.getBlobToText(
                    this.containerName,
                    blobName,
                    (error, result, response) => {
                        if (error) {
                            logger.error('Error downloading file:', error);
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );
            });
        } catch (error) {
            logger.error('Download file error:', error);
            throw error;
        }
    }

    async generateSasToken(blobName, expiryHours = 1) {
        try {
            const startDate = new Date();
            startDate.setMinutes(startDate.getMinutes() - 5); // Start 5 minutes ago to avoid clock skew
            const expiryDate = new Date(startDate);
            expiryDate.setHours(startDate.getHours() + expiryHours);

            const sharedAccessPolicy = {
                AccessPolicy: {
                    Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
                    Start: startDate,
                    Expiry: expiryDate
                }
            };

            const sasToken = this.blobService.generateSharedAccessSignature(
                this.containerName, 
                blobName, 
                sharedAccessPolicy
            );
            
            return sasToken;
        } catch (error) {
            logger.error('Generate SAS token error:', error);
            throw error;
        }
    }

    async getFileUrlWithSas(blobName, expiryHours = 1) {
        try {
            const sasToken = await this.generateSasToken(blobName, expiryHours);
            const url = this.blobService.getUrl(this.containerName, blobName, sasToken);
            return url;
        } catch (error) {
            logger.error('Get file URL with SAS error:', error);
            throw error;
        }
    }

    getContentType(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        const contentTypes = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };
        return contentTypes[extension] || 'application/octet-stream';
    }

    async deleteFile(blobName) {
        try {
            return new Promise((resolve, reject) => {
                this.blobService.deleteBlob(
                    this.containerName,
                    blobName,
                    (error, response) => {
                        if (error) {
                            logger.error('Error deleting file:', error);
                            reject(error);
                        } else {
                            logger.info('File deleted successfully:', blobName);
                            resolve(true);
                        }
                    }
                );
            });
        } catch (error) {
            logger.error('Delete file error:', error);
            throw error;
        }
    }
}

// Create singleton instance
let azureBlobStorage;
try {
    const storageKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';
    const hasPlaceholderKey = /your_account_key_here/i.test(storageKey);

    if (process.env.AZURE_STORAGE_ACCOUNT_NAME && storageKey && !hasPlaceholderKey) {
        azureBlobStorage = new AzureBlobStorage();
    } else {
        logger.warn('Azure Storage is disabled because a real account key is not configured');
        azureBlobStorage = null;
    }
} catch (error) {
    logger.error('Azure Blob Storage initialization failed:', error);
    azureBlobStorage = null;
}

module.exports = azureBlobStorage;