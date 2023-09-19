import { S3Client, GetObjectCommand  } from "@aws-sdk/client-s3";
import  { RekognitionClient, IndexFacesCommand  } from '@aws-sdk/client-rekognition';
import ddb from "@aws-sdk/lib-dynamodb";
import * as dynamodb from "@aws-sdk/client-dynamodb";

const docClient = new dynamodb.DynamoDBClient()
const rekognition = new RekognitionClient();
const s3 = new S3Client();
const ddbDocClient = ddb.DynamoDBDocumentClient.from(docClient, {
    marshallOptions: {
        removeUndefinedValues: true,
    },
})
const bucketName = "face-scan-auth-bucket-s3";

const query_dynamo = async (params, confidence) => {
    let command = new ddb.QueryCommand(params);
    console.log(command);
    const data = await ddbDocClient.send(command);
    console.log("Query data: ", data, confidence);
    return data;
};

const getImageS3 = async (input) => {
    let objectKey = input.Records[0].s3.object.key;
        const getObjectParams = {
              Bucket: bucketName, // Replace with your S3 bucket name
              Key: objectKey,     // Replace with the key of the uploaded image
        };
        const command = new GetObjectCommand(getObjectParams);
        const response = await s3.send(command);
        // const imageBytes = response.Body;
        console.log('getimageS3: ', response);
        if (!response.Body) {
            throw new Error("Failed to retrieve the S3 object.");
        }
        const result = await streamToBuffer(response.Body);
    return result;
    
}
async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });
}

const buildResponse = (statusCode, body= null)=>{
    let jsonResponse = {
        statusCode: statusCode,
        headers: {
            ContentType: 'application/json',
            AccessControlAllowOrigin: '*'
        }
    }
    if (body != null){
        jsonResponse.body = JSON.dumps(body);

    }
    return jsonResponse;
}

export const handler = async (event) => {
    console.log("EVENT: ", event);
        console.log("EVENT: ", event.Records[0].s3);
        console.log("EVENT: ", event.Records[0].requestParameters);
        console.log("EVENT: ", event.Records[0].responseElements);

    try{
        
        
        const imageBytes = await getImageS3(event);
        // const base64Image = Buffer.from(imageBytes).toString("base64");
        
        
        
        
        
        let searchByFaceParams = {
          Image: {
                Bytes: imageBytes
            },
            CollectionId :'employees'
          };
        const command = new IndexFacesCommand(searchByFaceParams);
        console.log("test1");
        console.log("Command: ", command);
        let response = await rekognition.send(command);
        console.log("test2");
        console.log('search_faces_by_image response:', response);
        
        
        
        console.log("BEfore for loop Response", response);
        console.log("BEfore for loop Response", response.FaceRecords[0].Face);
        console.log("BEfore for loop Response", response.FaceRecords[0].FaceDetail);
        for (let i = 0; i<response.FaceRecords.length; i++){
            console.log( "Reuslt in for loop ", response.FaceRecords[i].Face.FaceId, response.FaceRecords[i].FaceDetail.Confidence);
            const faceid = response.FaceRecords[i].Face.FaceId;
            const confidence = response.FaceRecords[i].FaceDetail.Confidence;
            
            //implement query
            let queryParams = {
              TableName: 'employee-face-scan',
              KeyConditionExpression: "#rekognitionid=:rekognitionid ",
                ExpressionAttributeNames: {
                    '#rekognitionid': "rekognitionid"
                },
                ExpressionAttributeValues: {
                    ':rekognitionid': faceid
                }
            }
            let face = await query_dynamo(queryParams, confidence);
            console.log(face);
            if(face.Items != null){
                console.log(`user found! ${face.Items[i].firstName}, ${face.Items[i].lastName}, confidence: ${confidence}`);
                return (`user found! ${face.Items[i].firstName} ${face.Items[i].lastName}, confidence: ${confidence}`);
                            
            }else{
                console.log('Person not found')
                return 'Preson not found';
            }
            
        }
        
        
    }
    catch(err){
        throw new Error(err);
      }
};