import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OrderLine } from '../models/order-line.model';

@Injectable({
  providedIn: 'root'
})
export class OrderLineService {
  private apiUrl = `${environment.apiUrl}/orderlines`;

  constructor(private http: HttpClient) { }

  getOrderLines(orderId: string): Observable<{ success: boolean, orderLines: OrderLine[], count: number }> {
    return this.http.get<{ success: boolean, orderLines: OrderLine[], count: number }>(`${this.apiUrl}/order/${orderId}`);
  }

  createOrderLine(orderId: string, data: Partial<OrderLine>): Observable<{ success: boolean, orderLine: OrderLine }> {
    return this.http.post<{ success: boolean, orderLine: OrderLine }>(`${this.apiUrl}/order/${orderId}`, data);
  }

  updateOrderLine(id: string, data: Partial<OrderLine>): Observable<{ success: boolean, orderLine: OrderLine }> {
    return this.http.put<{ success: boolean, orderLine: OrderLine }>(`${this.apiUrl}/${id}`, data);
  }

  activate(id: string): Observable<{ success: boolean, orderLine: OrderLine, customerProduct: any }> {
    return this.http.put<{ success: boolean, orderLine: OrderLine, customerProduct: any }>(`${this.apiUrl}/${id}/activate`, {});
  }

  cancel(id: string): Observable<{ success: boolean, orderLine: OrderLine }> {
    return this.http.put<{ success: boolean, orderLine: OrderLine }>(`${this.apiUrl}/${id}/cancel`, {});
  }
}
