import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    constructor(
        private router: Router,
        private authService: AuthService
    ) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        if (this.authService.isAuthenticated()) {
            // Check for required roles if specified in route data
            const requiredRoles = route.data['roles'] as Array<string>;
            if (requiredRoles) {
                if (this.authService.hasAnyRole(requiredRoles)) {
                    return true;
                } else {
                    // Role not authorized, redirect to access denied or home
                    this.router.navigate(['/auth/access']);
                    return false;
                }
            }
            return true;
        }

        // Not logged in so redirect to login page with the return url
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return false;
    }
}
