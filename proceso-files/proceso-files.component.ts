import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { AuthService } from 'src/app/auth.service';
import { environment } from 'src/environments/environment';
import { ResponseModel } from 'src/app/interfaces/response.interface';

interface FilesSave {
  nombreFile: string,
  estado: number,
  cargando: boolean,
  index: number
}

class NombreArchivos {
  constructor(
    public nombreRecibido:string,
    public id:number
  ){}
}

@Component({
  selector: 'app-proceso-files',
  templateUrl: './proceso-files.component.html',
  styleUrls: ['./proceso-files.component.scss']
})

export class ProcesoFilesComponent {

  filesSave: FilesSave[] = [];
  url = environment.urlBase.mgr_workFlow + '/files/uploadTemp';
  peticionArchivo: XMLHttpRequest;
  porcentaje: number = 0;

  nombreArchivos:NombreArchivos[] = [];

  @Output() subiendoArchivo = new EventEmitter<boolean>();
  @Output() emitirNombresArchivos = new EventEmitter<NombreArchivos[]>();

  constructor(private auth: AuthService) { }

  ngOnInit(): void { }

  uploadFile(fileList:FileList) {
    this.subiendoArchivo.emit(true);
    let archivoSave = { nombreFile: fileList[0].name, estado: null, cargando: true, index: this.filesSave.length }
    this.filesSave.push(archivoSave)
    this.subirArchivo(fileList[0], archivoSave);
  }

  subirArchivo(file: File, archivoSave: FilesSave) {
    this.peticionArchivo = new XMLHttpRequest();
    let formData = new FormData();
    formData.append('file', file, archivoSave.nombreFile);
    this.peticionArchivo.upload.addEventListener("progress", (event) => {
      let porcentaje = Math.round((event.loaded / event.total) * 100);
      this.porcentaje = porcentaje;
    })

    let self = this;
    this.peticionArchivo.onreadystatechange = function (oEvent) {
      if (self.peticionArchivo.readyState === 4) {
        self.subiendoArchivo.emit(false);
        self.porcentaje = 0;
        if (self.peticionArchivo.status === 200) {
          let respuesta:ResponseModel = JSON.parse(self.peticionArchivo.responseText);
          self.nombreArchivos.push(new NombreArchivos(respuesta.response.filename, archivoSave.index));
          self.emitirNombresArchivos.emit(self.nombreArchivos);
          self.filesSave[archivoSave.index] = { ...archivoSave, estado: 1, cargando:false }
        } else {
          self.filesSave[archivoSave.index] = { ...archivoSave, estado: 0,cargando:false}
        }
      } 
    };

    this.peticionArchivo.open('post', this.url, true);
    this.peticionArchivo.setRequestHeader('Authorization', 'Bearer ' + this.auth.getToken());
    this.peticionArchivo.send(formData);
  }

  cancelarPeticion() {
    this.peticionArchivo.abort();
  }

  deleteAttachment(index: number) {
    let archivoEliminar = this.filesSave[index];
    let indiceNombreEliminar = this.nombreArchivos.findIndex(item=>item.id===archivoEliminar.index);
    if (indiceNombreEliminar !== -1){
      this.nombreArchivos.splice(indiceNombreEliminar, 1);
    }
    this.emitirNombresArchivos.emit(this.nombreArchivos);
    this.filesSave.splice(index, 1)
  }

  private get_base_64(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function (error) {
        reject(error)
      };
    })
  }
}
