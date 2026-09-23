// Only hide the preview visually: keep the video, stream and tracking loop alive.
export class CameraPreview {
 constructor(card,hideButton,showButton){
  Object.assign(this,{card,hideButton,showButton,concealed:false,enabled:false});
  hideButton.onclick=()=>this.setConcealed(true);
  showButton.onclick=()=>this.setConcealed(false);
  this.render();
 }
 update({screen,mode}){
  this.enabled=mode==='camera'&&(screen==='playing'||screen==='paused');
  if(!this.enabled)this.concealed=false;
  this.render();
 }
 setConcealed(concealed){
  if(!this.enabled)return;
  this.concealed=concealed;this.render();
  (concealed?this.showButton:this.hideButton).focus({preventScroll:true});
 }
 render(){
  this.card.classList.toggle('preview-hidden',this.concealed);
  this.card.setAttribute('aria-hidden',String(this.concealed));
  this.hideButton.hidden=!this.enabled;
  this.showButton.hidden=!this.enabled||!this.concealed;
  this.showButton.setAttribute('aria-expanded',String(!this.concealed));
 }
}
