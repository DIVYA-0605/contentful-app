import React, { useState, useEffect } from 'react';
import { createClient } from 'contentful-management';
import { toast,ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const VALID_FILE_TYPES = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

const FileUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
  }, [selectedFiles]);

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files).filter(file =>
      VALID_FILE_TYPES.includes(file.type) || file.name.toLowerCase().endsWith('.csv')
    );
    setSelectedFiles(files);
  };

  const uploadBatch = async (batch) => {
    try {
      const client = createClient({
        accessToken: 'CFPAT-VYkTnT9n-nfrq4ZKZ8tXp9DOzrKjiOM4La5m6XDl7nI',
      });

      const space = await client.getSpace('9dw4krr5xhmc');
      const environment = await space.getEnvironment('master');

      const existingAssets = await environment.getAssets();
      const existingAssetTitles = existingAssets.items.map(item => item.fields.title['en-US']);

      const uploadPromises = batch.map(async (file) => {
        if (existingAssetTitles.includes(file.name)) {
          const shouldReplace = await toast.promise(
            Promise.resolve(false),
            {
              pending: `An asset with title "${file.name}" already exists. Do you want to replace it?`,
              error: 'Error confirming replacement',
              success: `Asset "${file.name}" already existed and was replaced`,
            }
          );
          if (!shouldReplace) {
            return; // Skip this asset and continue with the next one
          }

          // Delete the existing asset
          const existingAsset = existingAssets.items.find(item => item.fields.title['en-US'] === file.name);
          await existingAsset.unpublish();
          await existingAsset.delete();
        }

        try {
          const asset = await environment.createAssetFromFiles({
            fields: {
              title: {
                'en-US': file.name,
              },
              file: {
                'en-US': {
                  contentType: file.type,
                  fileName: file.name,
                  file: file,
                },
              },
            },
          });

          await asset.processForAllLocales();

          // Fetch the latest version of the asset
          const latestAsset = await environment.getAsset(asset.sys.id);

          // Publish the latest version of the asset
          await latestAsset.publish();
        } catch (error) {
          console.error('Upload error:', error);
        }
      });

      await Promise.all(uploadPromises);
    } catch (error) {
      throw error;
    }
  };

  const handleUpload = async () => {
    try {
      const chunkSize = 2; // Adjust chunk size as needed
      const totalChunks = Math.ceil(selectedFiles.length / chunkSize);

      toast.info('Starting file upload...');

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const startIndex = chunkIndex * chunkSize;
        const endIndex = startIndex + chunkSize;
        const chunk = selectedFiles.slice(startIndex, endIndex);

        // toast.info(`Uploading chunk ${chunkIndex + 1} of ${totalChunks}`);

        await uploadBatch(chunk);

        // toast.success(`Chunk ${chunkIndex + 1} uploaded`);

        setProgress(((chunkIndex + 1) / totalChunks) * 100);
      }

      toast.success('Files uploaded successfully to Contentful!');

      setSelectedFiles([]); // Reset selectedFiles to an empty array
      setProgress(0); // Reset progress to 0
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred during file upload. Please try again.');
    }
  };

  return (
    <div>
      <input type="file" accept=".csv,.xlsx" multiple onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload Files</button>

      {selectedFiles.length > 0 && (
        <div>
          <p>Selected Files:</p>
          <ul>
            {selectedFiles.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}

      {progress > 0 && <p>Progress: {progress.toFixed(2)}%</p>}

      <ToastContainer /> {/* Add this line to render toast notifications */}
    </div>
  );
};

export default FileUpload;
