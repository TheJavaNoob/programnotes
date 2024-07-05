var express = require('express');
const fs = require('fs');
const axios = require('axios');
var fileNames = [];
var router = express.Router();
require('dotenv').config();
const { BlobServiceClient } = require('@azure/storage-blob');
const { randomBytes } = require('crypto');
const { url } = require('inspector');
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING

router.post('/ask', async (req, res) => {
    var data = req.body.data;
    //data = data.substring(1, data.length - 1); // Remove quotes

    var result = await ask(data).catch((error) => {
        res.statusCode = 500;
        res.end(error);
    });

    res.end(result);
});

router.post('/random', async (req, res) => {
    fileNames = await listBlob();
    const random = Math.floor(Math.random() * fileNames.length);
    const randomFileName = fileNames[random];
    const personName = randomFileName.substring(0, randomFileName.length - 5);
    res.data = personName;
    res.end(personName);
});

async function ask(data) {
    fileNames = await(listBlob());
    var fileName = data + ".json";
    // If the file exists in the blob
    if (fileNames.includes(fileName)){
        return await readBlob(fileName);
    }
    // Errors will be caught by the caller
    const personName = fileName.substring(0, fileName.length - 5);
    var result = await askAI(personName.replace("-", " "));
    uploadBlob(fileName, result);
    return result;
}

async function askAI(name) {
    var result;
    console.log("Asked for " + name);
    const question = `List the places ${name} have been to throughout his/her life, \
              including his/her place of birth and death (if the person is deceased),\
              list as many as possible.
              List these places in chronological order and specify the years he/she stayed in there.\
              Write a detailed description of his/her life and career in each of these places.\
              Then, find the longitude and latitude of these places.\
              Format all the data into the following json format.\
              [{"city": , "country": , "longitude": , "latitude": , \
              "start_year": , "end_year": , "description": , "is_deceased":}]\
              Do not give other comments besides the json.\
              `;
    const query = JSON.stringify({
        "model": "gpt-4o",
        "messages": [
            {
                "role": "user",
                "content": question
            }
        ],
        "stream": false,
        "model_params": {
            "temperature": 0.5
        }
    });
    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.theb.ai/v1/chat/completions',
        headers: {
            'Authorization': 'Bearer sk-YVXWvgmc8PCWU2en2DBqVGhlQi5BSQ9QHDdANIPXKMUDIzCF',
            'Content-Type': 'application/json'
        },
        data: query
    };
    response = await axios.request(config)
        .catch((error) => {
            console.log("Axios error: ", error.message);
            throw "Failed to ask AI because of server error";
        });
    if (response.status != 200) {
        console.log(response.data);
        throw "Failed to ask AI";
    }
    result = response.data.choices[0].message.content;
    result = result.replaceAll(/\\n/g, '\n');
    result = result.replaceAll(/\\/g, '');
    result = result.replaceAll("N/A", "-1");
    result = result.replaceAll("-,", "-1,");
    result = result.replace("```json", '');
    result = result.replace("```", '');
    return result;
}

module.exports = router;


async function readBlob(blobName) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER_NAME);
    const blobClient = containerClient.getBlobClient(blobName);
    const downloadBlockBlobResponse = await blobClient.download(0);
    const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody);
    return downloaded;
}

// A helper function used to read a Node.js readable stream into a string
async function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => {
            chunks.push(data.toString());
        });
        readableStream.on("end", () => {
            resolve(chunks.join(""));
        });
        readableStream.on("error", reject);
    });
}

async function uploadBlob(blobName, content) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const uploadBlobResponse = await blockBlobClient.upload(content, content.length);
    console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);
}

async function doFileExistInBlob(blobName) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER_NAME);
    const blobClient = containerClient.getBlobClient(blobName);
    const exists = await blobClient.exists();
    return exists;
}

async function listBlob(){
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER_NAME);
    let blobList = [];
    for await (const blob of containerClient.listBlobsFlat()) {
        blobList.push(blob.name);
    }
    
    return blobList;
}