// const multer = require("multer");
// const path = require("path");
// const firebaseSecret = {
//   type: process.env.GOOGLE_TYPE,
//   project_id: process.env.GOOGLE_PROJECT_ID,
//   private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
//   private_key: process.env.GOOGLE_PRIVATE_KEY,
//   client_email: process.env.GOOGLE_CLIENT_EMAIL,
//   client_id: process.env.GOOGLE_CLIENT_ID,
//   auth_uri: process.env.GOOGLE_AUTH_URI,
//   token_uri: process.env.GOOGLE_TOKEN_URI,
//   auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
//   client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
//   universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
// }
// const storage = multer.diskStorage({
//   destination: function (req, res, cb) {
//     cb(null, path.join(__dirname, "./uploads"));
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     const filename = file.originalname.split(".")[0];
//     cb(null, filename + "-" + uniqueSuffix + ".png");
//   },
// });

// exports.upload = multer({ storage: storage });
const { google } = require("googleapis");
const multer = require("multer");
const { Readable } = require("stream");

const firebaseSecret = {
  type: process.env.GOOGLE_TYPE,
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY,
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: process.env.GOOGLE_AUTH_URI,
  token_uri: process.env.GOOGLE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
};

// Initialize Google Drive API client
const auth = new google.auth.GoogleAuth({
  credentials: firebaseSecret,
  scopes: ['https://www.googleapis.com/auth/drive'],
});
const driveService = google.drive({ version: 'v3', auth });

// Use memory storage for multer to avoid saving on disk
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function to convert buffer to stream
const bufferToStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

// Function to upload file to Google Drive
const uploadToDrive = async (file, folderId) => {
  const fileMetadata = {
    name: file.originalname,
    parents: folderId ? [folderId] : [],
  };
  
  // Use bufferToStream to pass the file buffer as a readable stream
  const media = {
    mimeType: file.mimetype,
    body: bufferToStream(file.buffer),
  };

  try {
    const response = await driveService.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name',
    });

    const fileId = response.data.id;
    await driveService.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    const viewableUrl = `https://drive.google.com/thumbnail?id=${fileId}`;
    return { id: fileId, name: response.data.name, viewableUrl: viewableUrl };

  } catch (error) {
    throw new Error(`Error uploading file: ${error.message}`);
  }
};

module.exports = { upload, uploadToDrive };

