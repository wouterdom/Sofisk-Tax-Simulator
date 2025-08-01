import { TestBed } from '@angular/core/testing';
import { LoggingService, LogLevel } from '@app/services/logging.service';

describe('LoggingService', () => {
  let service: LoggingService;
  let consoleSpy: jasmine.SpyObj<Console>;

  beforeEach(() => {
    consoleSpy = jasmine.createSpyObj('Console', ['debug', 'info', 'warn', 'error']);
    spyOn(console, 'debug').and.callFake(consoleSpy.debug);
    spyOn(console, 'info').and.callFake(consoleSpy.info);
    spyOn(console, 'warn').and.callFake(consoleSpy.warn);
    spyOn(console, 'error').and.callFake(consoleSpy.error);

    TestBed.configureTestingModule({
      providers: [LoggingService]
    });

    service = TestBed.inject(LoggingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should log debug messages correctly', () => {
    const message = 'Test debug message';
    const args = ['arg1', 'arg2'];

    service.debug(message, ...args);

    expect(console.debug).toHaveBeenCalledWith(
      jasmine.stringMatching(/\[Sofisk Tax\] \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] \[DEBUG\] Test debug message/),
      'arg1',
      'arg2'
    );
  });

  it('should log info messages correctly', () => {
    const message = 'Test info message';
    const args = ['arg1', 'arg2'];

    service.info(message, ...args);

    expect(console.info).toHaveBeenCalledWith(
      jasmine.stringMatching(/\[Sofisk Tax\] \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] \[INFO\] Test info message/),
      'arg1',
      'arg2'
    );
  });

  it('should log warning messages correctly', () => {
    const message = 'Test warning message';
    const args = ['arg1', 'arg2'];

    service.warn(message, ...args);

    expect(console.warn).toHaveBeenCalledWith(
      jasmine.stringMatching(/\[Sofisk Tax\] \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] \[WARNING\] Test warning message/),
      'arg1',
      'arg2'
    );
  });

  it('should log error messages correctly', () => {
    const message = 'Test error message';
    const error = new Error('Test error');
    const args = ['arg1', 'arg2'];

    service.error(message, error, ...args);

    expect(console.error).toHaveBeenCalledWith(
      jasmine.stringMatching(/\[Sofisk Tax\] \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] \[ERROR\] Test error message/),
      error,
      'arg1',
      'arg2'
    );
  });

  it('should log error messages without error object', () => {
    const message = 'Test error message';
    const args = ['arg1', 'arg2'];

    service.error(message, undefined, ...args);

    expect(console.error).toHaveBeenCalledWith(
      jasmine.stringMatching(/\[Sofisk Tax\] \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] \[ERROR\] Test error message/),
      'arg1',
      'arg2'
    );
  });
});