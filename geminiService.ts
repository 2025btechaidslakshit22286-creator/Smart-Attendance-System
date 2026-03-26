import { GoogleGenAI, Type } from "@google/genai";
import { Student } from "../types";

export class GeminiFaceRecognition {
  constructor() {}

  async identifyStudents(currentFrameBase64: string, registeredStudents: Student[]): Promise<string[]> {
    if (registeredStudents.length === 0) return [];

    const maxRetries = 3;
    let retryCount = 0;

    const executeRequest = async (): Promise<string[]> => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        
        // Prepare multimodal parts
        const parts: any[] = [
          { 
            text: `You are a high-precision multi-face recognition system for a student attendance system.
            
            INPUT:
            1. A "Target Image" (the first image provided).
            2. A set of "Reference Images" for registered students, each labeled with their Student Name and ID.
            
            TASK:
            Identify all registered students who are clearly visible in the Target Image.
            
            RULES:
            1. Compare faces in the Target Image against the Reference Images.
            2. Only match if you are very confident (95%+).
            3. Multiple students may be present in the Target Image. Identify ALL of them.
            4. If no registered students are found, return an empty list.
            5. Return the result as a JSON array of Student IDs.` 
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: currentFrameBase64.split(',')[1] || currentFrameBase64,
            },
          },
          { text: "--- REFERENCE IMAGES OF REGISTERED STUDENTS ---" }
        ];

        // Add reference photos for each student
        // Use up to 2 photos for better matching
        registeredStudents.forEach(student => {
          if (student.registeredPhotos && student.registeredPhotos.length > 0) {
            const photosToUse = student.registeredPhotos.slice(0, 2);
            photosToUse.forEach((photo, index) => {
              parts.push({ text: `Student: ${student.name} | ID: ${student.id} | Photo: ${index + 1}` });
              parts.push({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: photo.split(',')[1] || photo,
                },
              });
            });
          }
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts },
          config: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: "The ID of the detected student"
              }
            }
          }
        });

        const resultText = response.text?.trim() || "[]";
        console.log(`AI Recognition Raw Result: ${resultText}`);
        
        try {
          const detectedIds: string[] = JSON.parse(resultText);
          // Validate that the IDs actually belong to registered students
          return detectedIds.filter(id => registeredStudents.some(s => s.id === id));
        } catch (parseError) {
          console.error("Failed to parse AI response as JSON:", resultText);
          return [];
        }
      } catch (error: any) {
        // Handle Rate Limiting (429) or Overloaded (503)
        if ((error.status === 429 || error.status === 503) && retryCount < maxRetries) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
          console.warn(`Gemini API busy (Status ${error.status}). Retrying in ${Math.round(delay)}ms... (Attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeRequest();
        }
        
        console.error("AI Recognition Error:", error);
        return [];
      }
    };

    return executeRequest();
  }
}
