import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';
import { CrApiService } from '../../api/cr-api.service';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser, id: string): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrDetailComponent);
	fixture.componentInstance.id = id;
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded state
	return fixture;
}

describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});

	it('disables Approve for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1'); // viewer: cr_r_o only; CR-1 is PENDING_APPROVAL
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);
	});

	it('sorts the timeline chronologically', async () => {
		const fixture = await render(users.approver, 'CR-1');

		const timeline = fixture.componentInstance.timeline;

		expect(timeline.map((entry) => entry.action)).toEqual(['CREATE', 'SUBMIT', 'SEND_FOR_APPROVAL']);
	});

	it('Keeps reject disabled until a valid reason is entered', async () => {
		const fixture = await render(users.approver, 'CR-1');

		const rejectButton = fixture.nativeElement.querySelector('.cr-actions__reject-btn');

		expect(rejectButton.disabled).toBe(true);

		fixture.componentInstance.rejectControl.setValue('Please review the change.');
		fixture.detectChanges();

		expect(rejectButton.disabled).toBe(false);
	});

	it('approves a pending change request', async () => {
		const fixture = await render(users.approver, 'CR-1');

		expect(fixture.componentInstance.detail?.status).toBe('PENDING_APPROVAL');

		await fixture.componentInstance.approve();
		fixture.detectChanges();

		expect(fixture.componentInstance.detail?.status).toBe('APPROVED');
		expect(fixture.componentInstance.detail?.audit.at(-1)?.action).toBe('APPROVE');
	});

	it('rejects a pending change request with a reason', async () => {
		const fixture = await render(users.approver, 'CR-1');

		fixture.componentInstance.rejectControl.setValue('The proposed price needs further review.');

		await fixture.componentInstance.reject();
		fixture.detectChanges();

		expect(fixture.componentInstance.detail?.status).toBe('REJECTED');

		const lastAudit = fixture.componentInstance.detail?.audit.at(-1);

		expect(lastAudit?.action).toBe('REJECT');
		expect(lastAudit?.note).toBe('The proposed price needs further review.');
	});

	it('does not reject when the reason is invalid', async () => {
		const fixture = await render(users.approver, 'CR-1');

		fixture.componentInstance.rejectControl.setValue('   ');

		await fixture.componentInstance.reject();
		fixture.detectChanges();

		expect(fixture.componentInstance.detail?.status).toBe('PENDING_APPROVAL');
	});

	it('disables actions while approval is in progress', async () => {
		const fixture = await render(users.approver, 'CR-1');

		const api = TestBed.inject(CrApiService);
		api.latencyMs = 100;

		const approvePromise = fixture.componentInstance.approve();

		fixture.detectChanges();

		const approveButton = fixture.nativeElement.querySelector('.cr-actions__approve');

		expect(fixture.componentInstance.submitting).toBe(true);
		expect(approveButton.disabled).toBe(true);

		await approvePromise;
		fixture.detectChanges();

		expect(fixture.componentInstance.submitting).toBe(false);
	});

	it('disables actions while approval is in progress', async () => {
		const fixture = await render(users.approver, 'CR-1');

		const api = TestBed.inject(CrApiService);
		api.latencyMs = 100;

		const approvePromise = fixture.componentInstance.approve();

		fixture.detectChanges();

		const approveButton = fixture.nativeElement.querySelector('.cr-actions__approve');

		expect(fixture.componentInstance.submitting).toBe(true);
		expect(approveButton.disabled).toBe(true);

		await approvePromise;
		fixture.detectChanges();

		expect(fixture.componentInstance.submitting).toBe(false);
	});

	it('shows an error and keeps the detail when approval fails', async () => {
		const fixture = await render(users.approver, 'CR-1');

		const api = TestBed.inject(CrApiService);
		api.failNext = true;

		await fixture.componentInstance.approve();
		fixture.detectChanges();

		expect(fixture.componentInstance.detail?.status).toBe('PENDING_APPROVAL');

		expect(fixture.componentInstance.actionError).toBe('Network error');

		expect(fixture.componentInstance.submitting).toBe(false);
	});

	it('renders an approval error message when the action fails', async () => {
		const fixture = await render(users.approver, 'CR-1');

		const api = TestBed.inject(CrApiService);
		api.failNext = true;

		await fixture.componentInstance.approve();
		fixture.detectChanges();

		const error = fixture.nativeElement.querySelector('.cr-actions__error');

		expect(error).not.toBeNull();
		expect(error.textContent).toContain('Network error');
	});
});
