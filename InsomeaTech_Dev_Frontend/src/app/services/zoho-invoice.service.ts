import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ZohoInvoice } from '../models/zoho-invoice.model';

@Injectable({
  providedIn: 'root'
})
export class ZohoInvoiceService {
  private apiUrl = `${environment.apiUrl}/zoho-invoices`;

  constructor(private http: HttpClient) { }

  getInvoices(params?: any): Observable<{ success: boolean, data: ZohoInvoice[], count: number }> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<{ success: boolean, data: ZohoInvoice[], count: number }>(this.apiUrl, { params: httpParams });
  }

  getInvoice(id: string): Observable<{ success: boolean, data: ZohoInvoice }> {
    return this.http.get<{ success: boolean, data: ZohoInvoice }>(`${this.apiUrl}/${id}`);
  }

  convertToXML(id: string): Observable<{ success: boolean, message: string, data: ZohoInvoice }> {
    return this.http.post<{ success: boolean, message: string, data: ZohoInvoice }>(`${this.apiUrl}/${id}/convert-xml`, {});
  }

  signXML(id: string, pin: string): Observable<{ success: boolean, message: string, data: ZohoInvoice }> {
    return this.http.post<{ success: boolean, message: string, data: ZohoInvoice }>(`${this.apiUrl}/${id}/sign-xml`, { pin });
  }

  // New signing methods
  getUnsignedXML(id: string): Observable<{ success: boolean, xml_no_sign: string, xml_base64: string }> {
    return this.http.get<{ success: boolean, xml_no_sign: string, xml_base64: string }>(`${this.apiUrl}/${id}/xml-no-sign`);
  }

  signWithLocalAgent(xmlBase64: string, pin: string): Observable<{ signedXml: string }> {
    // Calling the local desktop agent directly from the frontend
    return this.http.post<{ signedXml: string }>(environment.zohoSigningAgentUrl, { xml: xmlBase64, pin: pin });
  }

  saveSignedXML(id: string, signedXml: string): Observable<{ success: boolean, message: string, data: ZohoInvoice }> {
    return this.http.post<{ success: boolean, message: string, data: ZohoInvoice }>(`${this.apiUrl}/${id}/save-signed-xml`, { signedXml });
  }

  // TTN Agent Methods
  getTTNConfig(): Observable<{ success: boolean, config: { arg0: string, arg1: string, arg2: string } }> {
    return this.http.get<{ success: boolean, config: { arg0: string, arg1: string, arg2: string } }>(`${this.apiUrl}/ttn-config`);
  }

  submitToLocalAgent(arg0: string, arg1: string, arg2: string, arg3: string): Observable<string> {
    // Tell HttpClient to expect 'text' since the local agent returns raw XML
    return this.http.post(environment.zohoTtnSaveUrl, { arg0, arg1, arg2, arg3 }, { responseType: 'text' });
  }

  consultLocalAgent(arg0: string, arg1: string, arg2: string, documentNumber: string): Observable<string> {
    return this.http.post(environment.zohoTtnConsultUrl, { arg0, arg1, arg2, documentNumber }, { responseType: 'text' });
  }

  // Backend update methods after Agent calls
  updateTtnSubmit(id: string, data: { success: boolean, agentResponse: any }): Observable<{ success: boolean, message: string, data: ZohoInvoice }> {
    return this.http.post<{ success: boolean, message: string, data: ZohoInvoice }>(`${this.apiUrl}/${id}/update-ttn-submit`, data);
  }

  updateTtnConsult(id: string, data: { success: boolean, ttn_ref?: string, ttn_code?: string, agentResponse: any }): Observable<{ success: boolean, message: string, data: ZohoInvoice }> {
    return this.http.post<{ success: boolean, message: string, data: ZohoInvoice }>(`${this.apiUrl}/${id}/update-ttn-consult`, data);
  }

  submitToTTN(id: string): Observable<{ success: boolean, message: string, data: ZohoInvoice }> {
    return this.http.post<{ success: boolean, message: string, data: ZohoInvoice }>(`${this.apiUrl}/${id}/submit-ttn`, {});
  }

  consultTTN(id: string): Observable<{ success: boolean, message: string, data: ZohoInvoice }> {
    return this.http.post<{ success: boolean, message: string, data: ZohoInvoice }>(`${this.apiUrl}/${id}/consult-ttn`, {});
  }
}
