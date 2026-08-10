import { Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `<div class="layout-footer">
        Insomea Tech by
        <a href="https://www.insomea.com" target="_blank" rel="noopener noreferrer" class="text-primary font-bold hover:underline">Insomea</a>
    </div>`
})
export class AppFooter {}
