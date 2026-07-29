import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Customer } from '../models/customer.model';
import { Order } from '../models/order.model';
import { CustomerProduct } from '../models/customer-product.model';
import { OrderLine } from '../models/order-line.model';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private apiUrl = `${environment.apiUrl}/customers`;

  constructor(private http: HttpClient) { }

  getCustomers(params?: any): Observable<{ success: boolean, customers: Customer[], count: number }> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<{ success: boolean, customers: Customer[], count: number }>(this.apiUrl, { params: httpParams });
  }

  getCustomer(id: string): Observable<{ success: boolean, customer: Customer }> {
    return this.http.get<{ success: boolean, customer: Customer }>(`${this.apiUrl}/${id}`);
  }

  createCustomer(customer: Partial<Customer>): Observable<{ success: boolean, customer: Customer }> {
    return this.http.post<{ success: boolean, customer: Customer }>(this.apiUrl, customer);
  }

  updateCustomer(id: string, customer: Partial<Customer>): Observable<{ success: boolean, customer: Customer }> {
    return this.http.put<{ success: boolean, customer: Customer }>(`${this.apiUrl}/${id}`, customer);
  }

  deleteCustomer(id: string): Observable<{ success: boolean, message: string }> {
    return this.http.delete<{ success: boolean, message: string }>(`${this.apiUrl}/${id}`);
  }

  getCustomerOrders(id: string, params?: any): Observable<{ success: boolean, orders: Order[], count: number }> {
    let httpParams = new HttpParams();
    if (params) {
        Object.keys(params).forEach(key => {
            if (params[key]) {
                httpParams = httpParams.set(key, params[key]);
            }
        });
    }
    return this.http.get<{ success: boolean, orders: Order[], count: number }>(`${this.apiUrl}/${id}/orders`, { params: httpParams });
  }

  getCustomerProducts(id: string): Observable<{ success: boolean, customerProducts: CustomerProduct[], count: number }> {
      return this.http.get<{ success: boolean, customerProducts: CustomerProduct[], count: number }>(`${environment.apiUrl}/customerproducts/customer/${id}`);
  }

  getCustomerOrderLines(id: string): Observable<{ success: boolean, orderLines: OrderLine[], count: number }> {
      return this.http.get<{ success: boolean, orderLines: OrderLine[], count: number }>(`${environment.apiUrl}/orderlines/customer/${id}`);
  }
}
