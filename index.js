
const k8s = require('@kubernetes/client-node');
const http = require('http');
const https = require('https');

const tcm = {
    url: process.env.TCM_URL,
    appId: process.env.TCM_APP_ID,
    appSecret: process.env.TCM_APP_SECRET
};

const kc = new k8s.KubeConfig();
kc.ownerReferences
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.AppsV1beta2Api);

function updateReplicaSetOwner(owner, lastModified) {
    const lastModifiedTime = Date.parse(lastModified) / 1000;
    var resource = {
        spec: { 
            template: {
                metadata: {
                    labels: {
                        'kaltura/tcm-last-update': `${lastModifiedTime}`
                    }
                }
            }
        }
    };

    const httpOptions = {
        headers: {
            'Content-Type': 'application/merge-patch+json'
        }
    };
    
    k8sApi[`patchNamespaced${owner.kind}`](owner.name, 'kaltura', resource, undefined, undefined, httpOptions)
    .then(() => {
        console.log(`Updated resource type [${owner.kind}], name [${owner.name}], last modified [${lastModified}]`)
    })
    .catch(err => console.error(`Failed to update resource type [${owner.kind}], name [${owner.name}]: `, (err.response ? err.response.body : err)));
}

function getConfigLastUpdate(app) {
    return new Promise((resolve, reject) => {
        const tcmUrl = `${tcm.url}/${app}/raw?app_id=${tcm.appId}&app_secret=${tcm.appSecret}`;
        console.log(tcmUrl);
        let httpLib = tcmUrl.startsWith('https://') ? https : http;
        httpLib.get(tcmUrl, (res) => {
            const { statusCode } = res;
            res.resume();
            if (statusCode !== 200) {
                return reject(`HTTP Status Code: ${statusCode}`);
            }
            resolve(res.headers['last-modified']);
        }).on("error", (err) => {
            reject(`Error: ${err.message}`);
        });
    });
}

function watchApp(replicaSet) {
    const app = replicaSet.metadata.labels['kaltura/tcm-app'];
    getConfigLastUpdate(app)
    .then(lastModified => {
        updateReplicaSetOwner(replicaSet.metadata.ownerReferences.pop(), lastModified);
    })
    .catch(err => console.error(`Failed to get TCM configuration Replica-set [${replicaSet.metadata.name}], TCM application [${app}]: `, err));
}

k8sApi.listNamespacedReplicaSet('kaltura')
.then(response => {
    const tcmApps = response.body.items.filter(replicaSet => replicaSet.metadata.labels['kaltura/tcm-app']);
    tcmApps.forEach(watchApp);
})
.catch(err => console.error('Failed to get kaltura replication controllers: ', (err.response ? err.response.body : err)));

