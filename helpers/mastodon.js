
const fs = require('fs'),
      request = require('request'),
      helpers = require(__dirname + '/../helpers/helpers.js'),
      Mastodon = require('mastodon-api');

class MastodonClient {
  constructor(keys){
    let mastodonClientInstance = {};

    if (keys && keys.access_token && keys.api_url){
      mastodonClientInstance = new Mastodon(keys);
    } else {
      console.log('missing Twitter API keys');
    }

    this.client = mastodonClientInstance;
  }
  toot(text, cb){
    if (this.client){
      console.log('tooting...');
      this.client.post('statuses', { status: text }, (err, data, response) => {
        if (err){
          console.log('mastodon.toot error:', err);
        } else {
          console.log('tooted', data.url);
        }

        if (cb){
          cb(err, data);
        }
      });
    }
  }
  reply(message, response, cb){
    console.log('replying...');
    // console.dir(message, { depth: null });
    
    if (this.client){
      this.client.post('statuses', { 
        in_reply_to_id: message.data.status.id,
        spoiler_text: message.data.status.spoiler_text,
        visibility: message.data.status.visibility,
        status: `@${message.data.account.acct} ${response}`
      }, (err, data, response) => {
        if (cb){
          cb(err, data);
        }
      });
    }
  }
  reboost(message, cb){
    if (this.client){
      console.log('tooting...');
      this.client.post('statuses/:id/reblog', { id: message.data.status.id }, (err, data, response) => {
        if (err){
          console.log('mastodon.reboost error:', err);
        } else {
          console.log('reboosted', data.url);
        }

        if (cb){
          cb(err, data);
        }
      });
    }
  }
  poll(text, options, cb){
    if (this.client){
      console.log('posting a poll...');

      let optionsObj;

      if (typeof text === 'string'){
        optionsObj = {
          status: text,
          poll: {
            options: options,
            expires_in: 86400
          }, 
        };
      } else {
        optionsObj = text;
        cb = options;
      }
      
      const req = {
        uri: `${ this.client.config.api_url }/statuses`,
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + this.client.config.access_token,
        },
        json: optionsObj
      };

      request(req, (error, response, body) => {
        if (error){
          console.log(error)
        } else {
          // try{
          //   const resp = JSON.parse(body);
          //   if (resp.error){
          //     console.log('error', resp.error);
          //   }
          // } catch(err){ console.log(body, err) }
          if (body && body.url){
            console.log('poll posted', body.url);
          }
        }
        if (cb){
          cb(error, response, body);
        }
      });
    }    
  }  
  getNotifications(cb){
    if (this.client){
      console.log('retrieving notifications...');
      this.client.get('notifications', (err, notifications) => {
        if (cb){
          cb(err, notifications);
        }
      });
    }
  }
  dismissNotification(notification, cb){
    if (this.client && notification && notification.id){
      console.log('clearing notifications...');

      this.client.post('notifications/dismiss', {
        id: notification.id
      }).then((err, data, response) => {
        if (cb){
          cb(err, data);
        }
      }).catch((err) => {
        console.log('mastodon.dismissNotification error:', err);
      });
    }
  }
  postImage(options, cb){
    if (this.client){
      let client = this.client;
      
      const postImageFn = (client, filePath) => {
        client.post('media', {
          file: fs.createReadStream(filePath),
          description: options.alt_text
        }, (err, data, response) => {
          if (err){
            console.log('mastodon.postImage error:', err);
            if (cb){
              cb(err, data);
            }
          }
          else{
            console.log('tooting the image...');

            const statusObj = {
              status: options.status,
              // media_ids: new Array(data.media_id_string)
              media_ids: new Array(data.id)
            }

            if (options.in_reply_to_id){
              statusObj.in_reply_to_id = options.in_reply_to_id;
            }            

            client.post('statuses', statusObj,
            (err, data, response) => {
              if (err){
                console.log('mastodon.postImage error:', err);
              } else{
                console.log('tooted', data.url);
              }

              helpers.removeFile(filePath);
              
              if (cb){
                cb(err, data);
              }

            });
          }
        });
      }

      /* Support both image file path and image data */
      if (fs.existsSync(options.image)){
        postImageFn(client, options.image);
      } else {
        const imgFilePath = `${__dirname}/../.data/temp-${ Date.now() }-${ helpers.getRandomInt(1, Number.MAX_SAFE_INTEGER) }.png`;
        fs.writeFile(imgFilePath, options.image, 'base64', (err) => {
          if (!err){
            postImageFn(client, imgFilePath);
          }
        });
      }  
    }
  }
}

module.exports = MastodonClient;
