import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) { }

  getUsers(): Observable<{ success: boolean, data: User[], count: number }> {
    return this.http.get<{ success: boolean, data: User[], count: number }>(this.apiUrl);
  }

  getUser(id: string): Observable<{ success: boolean, data: User }> {
    return this.http.get<{ success: boolean, data: User }>(`${this.apiUrl}/${id}`);
  }

  updateUser(id: string, user: Partial<User>): Observable<{ success: boolean, data: User }> {
    return this.http.put<{ success: boolean, data: User }>(`${this.apiUrl}/${id}`, user);
  }
}