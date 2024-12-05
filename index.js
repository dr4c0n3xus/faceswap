const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const config = require("./config.json");

async function uploadImages({ source, face }) {
  try {
    const data = new FormData();

    data.append("file", fs.createReadStream(source));
    data.append("fileother", fs.createReadStream(face));
    data.append("alg", 1);
    data.append("serveUrl", 3);
    data.append("type", 13);

    const headers = {
      ...config.headers,
      ...data.getHeaders(),
    };

    const res = await axios.post(
      "https://access3.faceswapper.ai/api/FaceSwapper/UploadByFile",
      data,
      { headers },
    );

    console.log("images uploaded...");
    return res.data.data?.code;
  } catch (error) {
    console.error(
      "Error uploading images:",
      error.response ? error.response.data : error.message,
    );
    throw error;
  }
}

async function getImage(code) {
  try {
    const data = {
      code: code,
      serveUrl: 3,
      isGif: 0,
      type: 13,
    };

    const res = await axios.post(
      "https://access3.faceswapper.ai/api/FaceSwapper/CheckStatus",
      data,
      config,
    );

    if (res.data.data.status === "waiting") {
      console.log("swapping faces...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return getImage(code);
    } else {
      return res.data.data.downloadUrls[0];
    }
  } catch (error) {
    console.error(
      "Error getting image status:",
      error.response ? error.response.data : error.message,
    );
    throw error;
  }
}

async function init() {
  try {
    const args = process.argv.slice(2);

    if (args.length !== 2) {
      console.error("Please provide two image file paths as arguments.");
      process.exit(1);
    }

    const [sourcePath, facePath] = args;

    if (!fs.existsSync(sourcePath) || !fs.existsSync(facePath)) {
      console.error("One or both file paths do not exist.");
      process.exit(1);
    }
    const code = await uploadImages({
      source: sourcePath,
      face: facePath,
    });

    if (code) {
      const image = await getImage(code);
      if (image) {
        const imageResponse = await axios.get(image, {
          responseType: "stream",
        });
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:.]/g, "");
        const filePath = path.join(
          __dirname,
          "data",
          `result_${timestamp}.jpg`,
        );
        imageResponse.data.pipe(fs.createWriteStream(filePath));
        console.log("image saved @", filePath);
      } else {
        console.error("No image URL returned.");
      }
    } else {
      console.error("Failed to get image code from upload.");
    }
  } catch (error) {
    console.error("Error in init function:", error.message);
  }
}

init();
