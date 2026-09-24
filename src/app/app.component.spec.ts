import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { SessionService } from '../session/session.service';
import { users } from '../api/fixtures';
import { CrApiService } from '../api/cr-api.service';

describe('AppComponent', () => {
	it('updates the detail when a different change request is selected', async () => {
		await TestBed.configureTestingModule({
			imports: [AppComponent],
			providers: [
				{
					provide: SessionService,
					useValue: { user: users.approver },
				},
			],
		}).compileComponents();

		const fixture = TestBed.createComponent(AppComponent);

		fixture.detectChanges();

		// Wait for the initial list and detail requests
		await new Promise((resolve) => setTimeout(resolve, 0));
		fixture.detectChanges();

		const rows = fixture.nativeElement.querySelectorAll('.cr-list__row');

		expect(rows.length).toBeGreaterThan(1);

		rows[1].click();

		fixture.detectChanges();

		await new Promise((resolve) => setTimeout(resolve, 0));
		fixture.detectChanges();

		expect(fixture.componentInstance.selectedId).toBe('CR-2');
		expect(fixture.nativeElement.querySelector('.cr-detail')?.textContent).toContain('Replace SKU-B supplier');
	});

	it('shows permission-aware actions for a viewer', async () => {
		await TestBed.configureTestingModule({
			imports: [AppComponent],
			providers: [
				{
					provide: SessionService,
					useValue: { user: users.viewer },
				},
			],
		}).compileComponents();

		const fixture = TestBed.createComponent(AppComponent);

		fixture.detectChanges();

		await new Promise((resolve) => setTimeout(resolve, 0));
		fixture.detectChanges();

		const approveButton = fixture.nativeElement.querySelector('.cr-actions__approve') as HTMLButtonElement | null;

		const rejectButton = fixture.nativeElement.querySelector('.cr-actions__reject-btn') as HTMLButtonElement | null;

		expect(approveButton).not.toBeNull();
		expect(approveButton?.disabled).toBe(true);

		expect(rejectButton).toBeNull();
	});

	it('shows approval actions for an approver', async () => {
		await TestBed.configureTestingModule({
			imports: [AppComponent],
			providers: [
				{
					provide: SessionService,
					useValue: { user: users.approver },
				},
			],
		}).compileComponents();

		const fixture = TestBed.createComponent(AppComponent);

		fixture.detectChanges();

		await new Promise((resolve) => setTimeout(resolve, 0));
		fixture.detectChanges();

		const approveButton = fixture.nativeElement.querySelector('.cr-actions__approve') as HTMLButtonElement | null;

		const rejectButton = fixture.nativeElement.querySelector('.cr-actions__reject-btn') as HTMLButtonElement | null;

		expect(approveButton).not.toBeNull();
		expect(approveButton?.disabled).toBe(false);

		expect(rejectButton).not.toBeNull();
		expect(rejectButton?.disabled).toBe(true);
	});

	it('rejects a change request through the rendered UI', async () => {
		await TestBed.configureTestingModule({
			imports: [AppComponent],
			providers: [
				{
					provide: SessionService,
					useValue: { user: users.approver },
				},
			],
		}).compileComponents();

		const fixture = TestBed.createComponent(AppComponent);

		fixture.detectChanges();

		await new Promise((resolve) => setTimeout(resolve, 0));
		fixture.detectChanges();

		const reason = fixture.nativeElement.querySelector('.cr-actions__reason') as HTMLTextAreaElement;

		const rejectButton = fixture.nativeElement.querySelector('.cr-actions__reject-btn') as HTMLButtonElement;

		expect(rejectButton.disabled).toBe(true);

		reason.value = 'The change requires further review.';
		reason.dispatchEvent(new Event('input'));

		fixture.detectChanges();

		expect(rejectButton.disabled).toBe(false);

		rejectButton.click();

		await new Promise((resolve) => setTimeout(resolve, 0));
		fixture.detectChanges();

		expect(fixture.componentInstance.selectedId).toBe('CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail')?.textContent).toContain('REJECTED');
	});

	it('shows an error message when approval fails', async () => {
		await TestBed.configureTestingModule({
			imports: [AppComponent],
			providers: [
				{
					provide: SessionService,
					useValue: { user: users.approver },
				},
			],
		}).compileComponents();

		const fixture = TestBed.createComponent(AppComponent);

		fixture.detectChanges();

		await new Promise((resolve) => setTimeout(resolve, 0));
		fixture.detectChanges();

		const api = TestBed.inject(CrApiService);
		api.failNext = true;

		const approveButton = fixture.nativeElement.querySelector('.cr-actions__approve') as HTMLButtonElement;

		approveButton.click();

		await new Promise((resolve) => setTimeout(resolve, 0));
		fixture.detectChanges();

		const error = fixture.nativeElement.querySelector('.cr-actions__error');

		expect(error).not.toBeNull();
		expect(error.textContent).toContain('Network error');
	});

	it('shows a loading state while approval is in progress', async () => {
		await TestBed.configureTestingModule({
			imports: [AppComponent],
			providers: [
				{
					provide: SessionService,
					useValue: { user: users.approver },
				},
			],
		}).compileComponents();

		const fixture = TestBed.createComponent(AppComponent);

		fixture.detectChanges();

		await new Promise((resolve) => setTimeout(resolve, 0));
		fixture.detectChanges();

		const api = TestBed.inject(CrApiService);
		api.latencyMs = 100;

		const approveButton = fixture.nativeElement.querySelector('.cr-actions__approve') as HTMLButtonElement;

		expect(approveButton.disabled).toBe(false);

		approveButton.click();

		fixture.detectChanges();

		expect(approveButton.disabled).toBe(true);
		expect(approveButton.textContent).toContain('Approving...');

		await new Promise((resolve) => setTimeout(resolve, 120));
		fixture.detectChanges();

		expect(fixture.componentInstance.selectedId).toBe('CR-1');
	});
});
