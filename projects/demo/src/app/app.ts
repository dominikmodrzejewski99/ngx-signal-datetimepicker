import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, FormRoot, required, submit } from '@angular/forms/signals';
import { NgxDatetimePicker } from 'ngx-signal-datetimepicker';

interface MeetingModel {
  start: Date | null;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxDatetimePicker, FormField, FormRoot],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly basic = signal<Date | null>(new Date());
  protected readonly themed = signal<Date | null>(null);
  protected readonly custom = signal<Date | null>(null);

  protected readonly meeting = signal<MeetingModel>({ start: null });
  protected readonly meetingForm = form<MeetingModel>(this.meeting, (path) => {
    required(path.start, { message: 'Meeting start is required' });
  });

  protected submitState = signal<string>('');

  protected async submitMeeting(): Promise<void> {
    const ok = await submit(this.meetingForm, async () => {
      this.submitState.set(`Submitted: ${this.meeting().start?.toISOString() ?? 'null'}`);
      return undefined;
    });
    if (!ok) {
      this.submitState.set('Form is invalid');
    }
  }
}
