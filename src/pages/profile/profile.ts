import { NavController, ActionSheetController, ToastController, Platform, LoadingController, normalizeURL } from 'ionic-angular';

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Camera, CameraOptions, PictureSourceType } from '@ionic-native/camera';

import { File, FileEntry } from '@ionic-native/file';
import { WebView } from '@ionic-native/ionic-webview/ngx';

import { Storage } from '@ionic/storage';
 
import { finalize } from 'rxjs/operators';
import { FirebaseService } from '../service/firebase.service';

import { Crop } from '@ionic-native/crop';

 
const STORAGE_KEY = 'my_images'; 

declare var window;

@Component({ 
  selector: 'page-profile',
  templateUrl: 'profile.html'
})
export class ProfilePage implements OnInit {

  images = [];
  loading;
    
  constructor(public navCtrl: NavController, private camera: Camera, private file: File, private actionSheetController: ActionSheetController, private toastController: ToastController,private plt: Platform, private loadingController: LoadingController,private ref: ChangeDetectorRef, private storage: Storage, private webview: WebView, public firebaseService: FirebaseService, private crop: Crop, public loadingCtrl: LoadingController) {

      console.log('testing');
      console.log(this.webview);
      console.log(window);
  }
    
  ngOnInit() {
    this.plt.ready().then(() => {
      this.loadStoredImages();
    });
  }
    
  loadStoredImages() {
    this.storage.get(STORAGE_KEY).then(images => {
      if (images) {
        let arr = JSON.parse(images);
        this.images = [];
        for (let img of arr) {
          this.images.push({ name: img });
        }
        console.log(this.images);
      }
      else{
        var defaultImg = 'assets/imgs/default_img.jpeg';
        for(var i=0; i<3; i++){
          this.images.push({ name: defaultImg });
        }
      }
    });
  }
 
  pathForImage(img) {
    console.log('PathForImage');
    console.log(this.webview);
    if (img === null) {
      return '';
    } else {
      let converted = this.convertFileSrc(img);//this.webview.convertFileSrc(img);//window.Ionic.WebView.convertFileSrc(img);
      return converted;
    }
  }
 
  async presentToast(text) {
    const toast = await this.toastController.create({
        message: text,
        position: 'bottom',
        duration: 3000
    });
    toast.present();
  }

    
  async selectImage(index) {
        const actionSheet = await this.actionSheetController.create({
            title: "Select Image source",
            buttons: [{
                    text: 'Load from Library',
                    handler: () => {
                        this.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY, index);
                    }
                },
                {
                    text: 'Use Camera',
                    handler: () => {
                        this.takePicture(this.camera.PictureSourceType.CAMERA, index);
                    }
                },
                {
                    text: 'Cancel',
                    role: 'cancel'
                }
            ]
        });
        await actionSheet.present();
    }

    takePicture(sourceType: PictureSourceType, index) {
        var self = this;
        var options: CameraOptions = {
            quality: 100,
            sourceType: sourceType,
            saveToPhotoAlbum: true,
            correctOrientation: true
        };

        this.camera.getPicture(options).then(imagePath => {
            self.crop.crop(imagePath , {quality: 75})
              .then(
                newImage => {
                    console.log('new image path is: ' + newImage)                                        
                    this.updateStoredImages(newImage, index);                    
                },
                error => console.error('Error cropping image', error)
              );
            
        });
    }
    
    createFileName() {
        var d = new Date(),
        n = d.getTime(),
        newFileName = n + ".jpg";
        return newFileName;
    }

    copyFileToLocalDir(namePath, currentName, newFileName) {
        this.file.copyFile(namePath, currentName, this.file.dataDirectory, newFileName).then(success => {
            console.log('copyFileToLocalDir');
            console.log(success);
        }, error => {
            console.log(error);
            this.presentToast('Error while storing file.');
        });
    }

    updateStoredImages(name, index) {
        this.storage.get(STORAGE_KEY).then(images => {
            let arr = JSON.parse(images);
            if (!arr) {
                let newImages = [name];
                this.storage.set(STORAGE_KEY, JSON.stringify(newImages));
            } else {
                arr[index] = name;
                this.storage.set(STORAGE_KEY, JSON.stringify(arr));
            }

            this.images[index].name = name;
            this.ref.detectChanges(); // trigger change detection cycle
            this.uploadImageToFirebase(name);

        });
    }
    
    convertFileSrc(url) {
        if (!url) {
          return url;
        }
        if (url.startsWith('file://')) {
          return url.replace('file', window.WEBVIEW_FILE_PREFIX);
        }
        if (url.startsWith('content://')) {
            return url.replace('content://', window.WEBVIEW_CONTENT_PREFIX + ':///');
        }

        return url;
    }
    
    uploadImageToFirebase(image){
        var self = this;
        self.presentLoadingDefault();
        image = normalizeURL(image);

        //uploads img to firebase storage
        self.firebaseService.uploadImage(image)
        .then(photoURL => {
          self.loading.dismiss();
          let toast = self.toastController.create({
            message: 'Image was updated successfully',
            duration: 3000
          });
          toast.present();
          });
    }
    presentLoadingDefault() {
      var self = this;
      self.loading = this.loadingCtrl.create({
        content: 'Please wait...'
      });

      self.loading.present();

      setTimeout(() => {
        self.loading.dismiss();
      }, 8000);
    }

}
//fairytrail-ecb23