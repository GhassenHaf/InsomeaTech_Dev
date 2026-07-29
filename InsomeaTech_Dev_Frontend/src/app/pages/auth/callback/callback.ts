import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-auth-callback',
    standalone: true,
    template: `
        <div class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <i class="pi pi-spin pi-spinner text-4xl mb-4"></i>
                <p>Authenticating...</p>
            </div>
        </div>
    `
})
export class AuthCallbackComponent implements OnInit {
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private authService: AuthService
    ) {}

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            const token = params['token'];
            if (token) {
                this.authService.handleCallback(token);
                this.router.navigate(['/']);
            } else {
                this.router.navigate(['/auth/login'], { queryParams: { error: 'No token found' } });
            }
        });
    }
}
