import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check if token exists in localStorage
    const token = localStorage.getItem('jwt_token');
    if (token) {
      this.getCurrentUser().subscribe();
    }
  }

  login(): void {
    // Redirect to Azure AD login
    window.location.href = `${this.apiUrl}/auth/login`;
  }

  logout(): void {
    localStorage.removeItem('jwt_token');
    this.currentUserSubject.next(null);
    window.location.href = `${this.apiUrl}/auth/logout`;
  }

  handleCallback(token: string): void {
    if (token) {
      localStorage.setItem('jwt_token', token);
      this.getCurrentUser().subscribe();
    }
  }

  getCurrentUser(): Observable<any> {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      return of(null);
    }

    return this.http.get<{success: boolean, user: any}>(`${this.apiUrl}/auth/me`).pipe(
      tap(response => {
          if (response.success) {
            this.currentUserSubject.next(response.user);
          }
      }),
      catchError(error => {
        console.error('Error getting current user:', error);
        // Do NOT remove token here. Let the interceptor handle 401s.
        // localStorage.removeItem('jwt_token'); 
        this.currentUserSubject.next(null);
        return of(null);
      })
    );
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('jwt_token');
  }

  getUserRole(): string | null {
    
    const user = this.currentUserSubject.value;
    return user?.role || null;
  }

  hasRole(role: string): boolean {
    return this.getUserRole() === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole();
    return userRole ? roles.includes(userRole) : false;
  }
}