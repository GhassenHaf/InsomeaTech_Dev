import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CustomerProduct } from '../models/customer-product.model';

@Injectable({
  providedIn: 'root'
})
export class CustomerProductService {
  private apiUrl = `${environment.apiUrl}/customerproducts`;

  constructor(private http: HttpClient) { }

  // Get all customer products with optional filters
  getCustomerProducts(params?: any): Observable<{ success: boolean, customerProducts: CustomerProduct[], count: number }> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<{ success: boolean, customerProducts: CustomerProduct[], count: number }>(this.apiUrl, { params: httpParams });
  }

  // Get products for a specific customer
  getByCustomerId(customerId: string): Observable<{ success: boolean, customerProducts: CustomerProduct[], count: number }> {
    return this.http.get<{ success: boolean, customerProducts: CustomerProduct[], count: number }>(`${this.apiUrl}/customer/${customerId}`);
  }

  // Get single customer product by ID
  getById(id: string): Observable<{ success: boolean, customerProduct: CustomerProduct }> {
    return this.http.get<{ success: boolean, customerProduct: CustomerProduct }>(`${this.apiUrl}/${id}`);
  }

  // Update customer product (e.g. status, notes)
  update(id: string, data: Partial<CustomerProduct>): Observable<{ success: boolean, customerProduct: CustomerProduct }> {
    return this.http.put<{ success: boolean, customerProduct: CustomerProduct }>(`${this.apiUrl}/${id}`, data);
  }

    // Delete customer product
  delete(id: string): Observable<{ success: boolean, message: string }> {
      return this.http.delete<{ success: boolean, message: string }>(`${this.apiUrl}/${id}`);
  }
}
