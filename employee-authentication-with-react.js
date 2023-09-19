import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
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

const buildResponse = (statusCode, body=None)=>{
    let jsonResponse = {
        statusCode: statusCode,
        headers: {
            ContentType: 'application/json',
            AccessControlAllowOrigin: '*'
        }
    }
    if (body != None){
        jsonResponse.body = json.dumps(body);

    }
    return jsonResponse;
}

export const handler = async (event) => {
    console.log("EVENT: ", event);
    
    try{
        let objectKey = event.queryStringParameters.objectKey;
    let imageBytes = s3.get_object(Bucket = bucketName, Key = objectKey).read();
    //error here have to send command 
    let response  = rekognition.search_faces_by_image(
        CollectionId = 'employees',
        Image= {
            "Bytes": imageBytes
        }
    )
    console.log("BEfore for loop Response", response);
    for (let match = 0; i<response.FaceMatches.length; i++){
        console.log(match.Face.FaceId, match.Face.Confidence);
        
        //implement query
        let face = await queryItem(match.Face.FaceId);

        if(face.Item != null){
            console.log("Person found", face.Item);
            return buildResponse(400, {
                Message: "Success",
                firstname: face.Item.firstName,
                lastname: face.Item.lastname
            });            
        }
        console.log("Person nont found");
    }
    return buildResponse(403, {Message: "Person not found."});
        
    }



    
    catch(err){
        throw new Error(err);
      }
};