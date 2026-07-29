import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) { }

  getProducts(params?: any): Observable<{ success: boolean, products: Product[], count: number }> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<{ success: boolean, products: Product[], count: number }>(this.apiUrl, { params: httpParams });
  }

  getProduct(id: string): Observable<{ success: boolean, product: Product }> {
    return this.http.get<{ success: boolean, product: Product }>(`${this.apiUrl}/${id}`);
  }

  createProduct(product: Partial<Product>): Observable<{ success: boolean, product: Product }> {
    return this.http.post<{ success: boolean, product: Product }>(this.apiUrl, product);
  }

  updateProduct(id: string, product: Partial<Product>): Observable<{ success: boolean, product: Product }> {
    return this.http.put<{ success: boolean, product: Product }>(`${this.apiUrl}/${id}`, product);
  }

  deleteProduct(id: string): Observable<{ success: boolean, message: string }> {
    return this.http.delete<{ success: boolean, message: string }>(`${this.apiUrl}/${id}`);
  }
}