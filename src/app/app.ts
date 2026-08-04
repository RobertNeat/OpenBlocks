import { Component, signal } from '@angular/core';

@Component({
  selector: 'ob-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('open-blocks');
}
