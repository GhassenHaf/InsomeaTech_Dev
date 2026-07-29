import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Order } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) { }

  getOrders(params?: any): Observable<{ success: boolean, orders: Order[], count: number }> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<{ success: boolean, orders: Order[], count: number }>(this.apiUrl, { params: httpParams });
  }

  getOrder(id: string): Observable<{ success: boolean, order: Order }> {
    return this.http.get<{ success: boolean, order: Order }>(`${this.apiUrl}/${id}`);
  }

  createOrder(order: any): Observable<{ success: boolean, order: Order }> {
    return this.http.post<{ success: boolean, order: Order }>(this.apiUrl, order);
  }

  updateOrder(id: string, order: Partial<Order>): Observable<{ success: boolean, order: Order }> {
    return this.http.put<{ success: boolean, order: Order }>(`${this.apiUrl}/${id}`, order);
  }

  updateStatus(id: string, status: string, notes?: string): Observable<{ success: boolean, order: Order }> {
    return this.http.put<{ success: boolean, order: Order }>(`${this.apiUrl}/${id}/status`, { status_order: status, notes });
  }

  deleteOrder(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`);
  }

  uploadFile(id: string, type: 'lpo' | 'so' | 'proof_tech', file: File): Observable<{ success: boolean, fileUrl: string, order: Order }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ success: boolean, fileUrl: string, order: Order }>(`${this.apiUrl}/${id}/files?type=${type}`, formData);
  }

  downloadFile(id: string, type: 'lpo' | 'so' | 'proof_tech'): Observable<{ success: boolean, fileUrl: string, message: string }> {
    return this.http.get<{ success: boolean, fileUrl: string, message: string }>(`${this.apiUrl}/${id}/files/${type}`);
  }

  financeApprove(id: string, poNumber: string, file?: File): Observable<{ success: boolean, order: Order }> {
    const formData = new FormData();
    formData.append('poNumber', poNumber);
    if (file) {
      formData.append('distiPo', file);
    }
    return this.http.patch<{ success: boolean, order: Order }>(`${this.apiUrl}/${id}/finance-approve`, formData);
  }

  startProvisioning(id: string): Observable<{ success: boolean, order: Order }> {
    return this.http.patch<{ success: boolean, order: Order }>(`${this.apiUrl}/${id}/start-provisioning`, {});
  }

  cancelOrder(id: string, reason: string): Observable<{ success: boolean, order: Order }> {
    return this.http.patch<{ success: boolean, order: Order }>(`${this.apiUrl}/${id}/cancel`, { reason });
  }
}