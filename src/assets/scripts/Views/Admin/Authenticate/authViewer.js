export default class AuthViewer {
   constructor() {
      this.init()
   }

   init() {
      this.logout = document.querySelector('#wp-admin-bar-logout a')
      this.message = document.querySelector('#login-messages')
      this.body = document.querySelector('#loginform')
      
      if (this.body) {
         this.user = this.body.querySelector('#user_login')
         this.pass = this.body.querySelector('#user_pass')
         this.remember =this.body.querySelector('#rememberme')
         this.submit = this.body.querySelector('#wp-submit')
         this.directto = this.body.querySelector('[name=redirect_to]')
      }
   }
}