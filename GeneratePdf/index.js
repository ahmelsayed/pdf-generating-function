const pdf = require('pdfkit');
const fs = require('fs');
const azure = require('azure-storage');
const svgToPdf = require('svg-to-pdfkit');

module.exports = function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    const doc = new pdf();
    const blobService = azure.createBlobService(process.env['AzureWebJobsStorage']);
    const fileName = makeId() + ".pdf";
    const stream = fs.createWriteStream(fileName);
    const containerName = 'pdfcontainer';
    const svg = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
viewBox="0 0 64 64" enable-background="new 0 0 64 64" xml:space="preserve">
<g>
<path fill="#3999C6" d="M63.6,32.4c0.6-0.6,0.5-1.7,0-2.3L60.5,27L46.7,13.6c-0.6-0.6-1.5-0.6-2.2,0l0,0c-0.6,0.6-0.8,1.7,0,2.3
   L59,30.1c0.6,0.6,0.6,1.7,0,2.3L44.2,47.1c-0.6,0.6-0.6,1.7,0,2.3l0,0c0.6,0.6,1.7,0.5,2.2,0l13.7-13.6c0,0,0,0,0.1-0.1L63.6,32.4z
   "/>
<path fill="#3999C6" d="M0.4,32.4c-0.6-0.6-0.5-1.7,0-2.3L3.5,27l13.8-13.4c0.6-0.6,1.5-0.6,2.2,0l0,0c0.6,0.6,0.8,1.7,0,2.3
   L5.3,30.1c-0.6,0.6-0.6,1.7,0,2.3l14.5,14.7c0.6,0.6,0.6,1.7,0,2.3l0,0c-0.6,0.6-1.7,0.5-2.2,0L3.6,36c0,0,0,0-0.1-0.1L0.4,32.4z"
   />
<polygon fill="#FCD116" points="47.6,2.5 28.1,2.5 17.6,32.1 30.4,32.2 20.4,61.5 48,22.4 34.6,22.4 	"/>
<polygon opacity="0.3" fill="#FF8C00" enable-background="new    " points="34.6,22.4 47.6,2.5 37.4,2.5 26.6,27.1 39.4,27.2
   20.4,61.5 48,22.4 	"/>
</g>
</svg>`;

    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setMinutes(startDate.getMinutes() + 1000);
    startDate.setMinutes(startDate.getMinutes() - 1000);

    const sharedAccessPolicy = {
        AccessPolicy: {
            Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
            Start: startDate,
            Expiry: expiryDate
        }
    };

    blobService.createContainerIfNotExists(containerName, {}, function (error, result, response) {
        if (!error) {
            doc.pipe(stream);

            const reqContent = req.body ? req.body.content + '' : 'empty body';

            doc.fontSize(25)
                .fillColor("gray")
                .text('Request content is:');

            doc.fontSize(25)
                .fillColor("black")
                .text(reqContent, 150, 100);

            svgToPdf(doc, svg, 130, 200, {
                width: 150,
                height: 150
            });

            doc.end();

            stream.on('finish', () => {
                blobService.createBlockBlobFromLocalFile(containerName, fileName, fileName, function (error, result, response) {
                    if (!error) {
                        const token = blobService.generateSharedAccessSignature(containerName, fileName, sharedAccessPolicy);
                        const sasUrl = blobService.getUrl(containerName, fileName, token);
                        context.res = {
                            body: sasUrl
                        }
                        context.done();
                    } else {
                        context.res = {
                            body: "Error",
                            status: 500
                        }
                        context.done();
                    }
                });
            });
        }
    });
};

function makeId() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
