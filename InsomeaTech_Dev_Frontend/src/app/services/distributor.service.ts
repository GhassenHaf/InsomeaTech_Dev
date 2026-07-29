import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Distributor } from '../models/distributor.model';

@Injectable({
  providedIn: 'root'
})
export class DistributorService {
  private apiUrl = `${environment.apiUrl}/distributors`;

  constructor(private http: HttpClient) { }

  getDistributors(params?: any): Observable<{ success: boolean, distis: Distributor[], count: number }> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<{ success: boolean, distis: Distributor[], count: number }>(this.apiUrl, { params: httpParams });
  }

  getDistributor(id: string): Observable<{ success: boolean, disti: Distributor }> {
    return this.http.get<{ success: boolean, disti: Distributor }>(`${this.apiUrl}/${id}`);
  }

  createDistributor(disti: Partial<Distributor>): Observable<{ success: boolean, disti: Distributor }> {
    return this.http.post<{ success: boolean, disti: Distributor }>(this.apiUrl, disti);
  }

  updateDistributor(id: string, disti: Partial<Distributor>): Observable<{ success: boolean, disti: Distributor }> {
    return this.http.put<{ success: boolean, disti: Distributor }>(`${this.apiUrl}/${id}`, disti);
  }

  deleteDistributor(id: string): Observable<{ success: boolean, message: string }> {
    return this.http.delete<{ success: boolean, message: string }>(`${this.apiUrl}/${id}`);
  }
}