import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ButtonModule, RouterModule, RippleModule, MessageModule],
    template: `
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                        <div class="text-center mb-8">
                            <img src="images/logo.png" alt="Insomea Logo" class="mb-8 w-32 shrink-0 mx-auto">
                            <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Welcome to Insomea Tech !</div>
                            <span class="text-muted-color font-medium">Sign in to continue</span>
                        </div>

                        <div *ngIf="errorMessage" class="mb-4 w-full">
                             <p-message severity="error" [text]="errorMessage" styleClass="w-full justify-content-start"></p-message>
                        </div>

                        <div>
                            <button pButton label="Sign In with Microsoft" icon="pi pi-microsoft" class="w-full" (click)="login()"></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class Login implements OnInit {
    errorMessage: string = '';

    constructor(private authService: AuthService, private route: ActivatedRoute) {}

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            if (params['error']) {
                switch(params['error']) {
                    case 'inactive_user':
                        this.errorMessage = 'Your account is inactive. Please contact your administrator.';
                        break;
                    case 'no_user':
                        this.errorMessage = 'No user found with this account. Please register first.';
                        break;
                    case 'auth_failed':
                        this.errorMessage = 'Authentication failed. Please try again.';
                        break;
                    case 'login_failed':
                        this.errorMessage = 'Login failed. Please try again.';
                        break;
                    default:
                        this.errorMessage = 'An unknown error occurred.';
                }
            }
        });
    }

    login() {
        this.authService.login();
    }
}