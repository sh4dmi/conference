import { IncomingMessage, ServerResponse } from 'http';
import * as fs from 'fs';
import * as path from 'path';

interface ImageUploadBody {
  fileName: string;
  imageData: string;
}

export const saveBackground = async (
  req: IncomingMessage & { body: ImageUploadBody },
  res: ServerResponse,
  next: (error?: unknown) => void
) => {
  try {
    const { fileName, imageData } = req.body;
    
    if (!fileName || !imageData) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Missing required fields' }));
      return;
    }
    
    // Remove the data:image/[type];base64, prefix
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    
    // Create the backgrounds directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'backgrounds');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Save the file
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, base64Data, 'base64');
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, path: `/backgrounds/${fileName}` }));
  } catch (error) {
    console.error('Error saving image:', error);
    next(error);
  }
}; 