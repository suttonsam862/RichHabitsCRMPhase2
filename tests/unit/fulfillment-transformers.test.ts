import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  transformObjectKeys,
  serializeFulfillmentEvent,
  deserializeFulfillmentEvent,
  serializeShippingInfo,
  deserializeShippingInfo,
  serializeQualityCheck,
  deserializeQualityCheck,
  parseDecimal,
  serializeArray,
  deserializeArray,
  generateShipmentNumber
} from '../../server/services/fulfillmentTransformers';

describe('Fulfillment Transformers', () => {
  
  describe('transformObjectKeys', () => {
    it('should transform object keys using provided transformer', () => {
      const obj = {
        firstName: 'John',
        lastName: 'Doe',
        homeAddress: {
          streetName: 'Main St',
          cityName: 'Springfield'
        }
      };

      const transformer = (key: string) => key.replace(/([A-Z])/g, '_$1').toLowerCase();
      const result = transformObjectKeys(obj, transformer);

      expect(result).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        home_address: {
          street_name: 'Main St',
          city_name: 'Springfield'
        }
      });
    });

    it('should handle null and undefined values', () => {
      expect(transformObjectKeys(null, (key) => key)).toBe(null);
      expect(transformObjectKeys(undefined, (key) => key)).toBe(undefined);
    });

    it('should handle arrays recursively', () => {
      const arr = [
        { userName: 'john', userAge: 25 },
        { userName: 'jane', userAge: 30 }
      ];

      const transformer = (key: string) => key.replace(/([A-Z])/g, '_$1').toLowerCase();
      const result = transformObjectKeys(arr, transformer);

      expect(result).toEqual([
        { user_name: 'john', user_age: 25 },
        { user_name: 'jane', user_age: 30 }
      ]);
    });

    it('should handle primitive values', () => {
      expect(transformObjectKeys('string', (key) => key)).toBe('string');
      expect(transformObjectKeys(123, (key) => key)).toBe(123);
      expect(transformObjectKeys(true, (key) => key)).toBe(true);
    });

    it('should handle deeply nested objects', () => {
      const deepObj = {
        level1: {
          level2: {
            level3: {
              deepValue: 'test'
            }
          }
        }
      };

      const transformer = (key: string) => key.toUpperCase();
      const result = transformObjectKeys(deepObj, transformer);

      expect(result).toEqual({
        LEVEL1: {
          LEVEL2: {
            LEVEL3: {
              DEEPVALUE: 'test'
            }
          }
        }
      });
    });

    it('should handle mixed arrays and objects', () => {
      const mixed = {
        items: [
          { itemName: 'item1', itemData: { subValue: 'test' } },
          { itemName: 'item2', itemData: { subValue: 'test2' } }
        ],
        metaData: {
          totalCount: 2
        }
      };

      const transformer = (key: string) => key.replace(/([A-Z])/g, '_$1').toLowerCase();
      const result = transformObjectKeys(mixed, transformer);

      expect(result).toEqual({
        items: [
          { item_name: 'item1', item_data: { sub_value: 'test' } },
          { item_name: 'item2', item_data: { sub_value: 'test2' } }
        ],
        meta_data: {
          total_count: 2
        }
      });
    });
  });

  describe('Fulfillment Event Transformers', () => {
    const mockCreateFulfillmentEventDTO = {
      orgId: 'org-123',
      orderId: 'order-123',
      orderItemId: 'item-123',
      workOrderId: 'work-123',
      eventCode: 'STATUS_CHANGE',
      eventType: 'status_change',
      statusBefore: 'pending',
      statusAfter: 'processing',
      actorUserId: 'user-123',
      notes: 'Status updated by system',
      metadata: { source: 'automation' }
    };

    const mockDbRow = {
      id: 'event-123',
      org_id: 'org-123',
      order_id: 'order-123',
      order_item_id: 'item-123',
      work_order_id: 'work-123',
      event_code: 'STATUS_CHANGE',
      event_type: 'status_change',
      status_before: 'pending',
      status_after: 'processing',
      actor_user_id: 'user-123',
      notes: 'Status updated by system',
      metadata: { source: 'automation' },
      created_at: '2025-01-20T10:00:00Z'
    };

    describe('serializeFulfillmentEvent', () => {
      it('should serialize DTO to database format', () => {
        const result = serializeFulfillmentEvent(mockCreateFulfillmentEventDTO);

        expect(result).toEqual({
          org_id: 'org-123',
          order_id: 'order-123',
          order_item_id: 'item-123',
          work_order_id: 'work-123',
          event_code: 'STATUS_CHANGE',
          event_type: 'status_change',
          status_before: 'pending',
          status_after: 'processing',
          actor_user_id: 'user-123',
          notes: 'Status updated by system',
          metadata: { source: 'automation' }
        });
      });

      it('should handle optional fields', () => {
        const minimalDTO = {
          orgId: 'org-123',
          orderId: 'order-123',
          eventCode: 'CREATED',
          eventType: 'creation'
        };

        const result = serializeFulfillmentEvent(minimalDTO);

        expect(result).toEqual({
          org_id: 'org-123',
          order_id: 'order-123',
          order_item_id: undefined,
          work_order_id: undefined,
          event_code: 'CREATED',
          event_type: 'creation',
          status_before: undefined,
          status_after: undefined,
          actor_user_id: undefined,
          notes: undefined,
          metadata: undefined
        });
      });
    });

    describe('deserializeFulfillmentEvent', () => {
      it('should deserialize database row to DTO format', () => {
        const result = deserializeFulfillmentEvent(mockDbRow);

        expect(result).toEqual({
          id: 'event-123',
          orgId: 'org-123',
          orderId: 'order-123',
          orderItemId: 'item-123',
          workOrderId: 'work-123',
          eventCode: 'STATUS_CHANGE',
          eventType: 'status_change',
          statusBefore: 'pending',
          statusAfter: 'processing',
          actorUserId: 'user-123',
          notes: 'Status updated by system',
          metadata: { source: 'automation' },
          createdAt: '2025-01-20T10:00:00Z'
        });
      });

      it('should handle null values in database row', () => {
        const rowWithNulls = {
          id: 'event-123',
          org_id: 'org-123',
          order_id: 'order-123',
          order_item_id: null,
          work_order_id: null,
          event_code: 'CREATED',
          event_type: 'creation',
          status_before: null,
          status_after: null,
          actor_user_id: null,
          notes: null,
          metadata: null,
          created_at: '2025-01-20T10:00:00Z'
        };

        const result = deserializeFulfillmentEvent(rowWithNulls);

        expect(result).toEqual({
          id: 'event-123',
          orgId: 'org-123',
          orderId: 'order-123',
          orderItemId: null,
          workOrderId: null,
          eventCode: 'CREATED',
          eventType: 'creation',
          statusBefore: null,
          statusAfter: null,
          actorUserId: null,
          notes: null,
          metadata: null,
          createdAt: '2025-01-20T10:00:00Z'
        });
      });
    });
  });

  describe('Shipping Info Transformers', () => {
    const mockShippingInfoDTO = {
      orgId: 'org-123',
      orderId: 'order-123',
      shipmentNumber: 'SHIP-20250120-0001',
      carrier: 'FedEx',
      service: 'Priority',
      trackingNumber: 'FX123456789',
      trackingUrl: 'https://fedex.com/track/FX123456789',
      labelUrl: 'https://labels.fedex.com/label-123.pdf',
      shippingCost: 15.99,
      weight: 2.5,
      dimensions: { length: 12, width: 8, height: 6, unit: 'inches' },
      shippingAddress: {
        name: 'John Doe',
        addressLine1: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        postalCode: '62701',
        country: 'US'
      },
      estimatedDeliveryDate: '2025-01-25T17:00:00Z',
      requiresSignature: true,
      isInsured: true,
      insuranceAmount: 100.00,
      statusCode: 'shipped',
      deliveryAttempts: 0,
      notes: 'Handle with care'
    };

    const mockShippingDbRow = {
      id: 'shipping-123',
      org_id: 'org-123',
      order_id: 'order-123',
      shipment_number: 'SHIP-20250120-0001',
      carrier: 'FedEx',
      service: 'Priority',
      tracking_number: 'FX123456789',
      tracking_url: 'https://fedex.com/track/FX123456789',
      label_url: 'https://labels.fedex.com/label-123.pdf',
      shipping_cost: '15.99',
      weight: '2.5',
      dimensions: { length: 12, width: 8, height: 6, unit: 'inches' },
      shipping_address: {
        name: 'John Doe',
        addressLine1: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        postalCode: '62701',
        country: 'US'
      },
      estimated_delivery_date: '2025-01-25T17:00:00Z',
      requires_signature: true,
      is_insured: true,
      insurance_amount: '100.00',
      status_code: 'shipped',
      delivery_attempts: 0,
      notes: 'Handle with care',
      created_at: '2025-01-20T10:00:00Z',
      updated_at: '2025-01-20T10:00:00Z'
    };

    describe('serializeShippingInfo', () => {
      it('should serialize shipping info DTO to database format', () => {
        const result = serializeShippingInfo(mockShippingInfoDTO);

        expect(result.org_id).toBe('org-123');
        expect(result.order_id).toBe('order-123');
        expect(result.carrier).toBe('FedEx');
        expect(result.tracking_number).toBe('FX123456789');
        expect(result.shipping_cost).toBe(15.99);
        expect(result.weight).toBe(2.5);
        expect(result.requires_signature).toBe(true);
        expect(result.is_insured).toBe(true);
        expect(result.insurance_amount).toBe(100.00);
      });

      it('should handle optional fields correctly', () => {
        const minimalDTO = {
          orgId: 'org-123',
          orderId: 'order-123',
          carrier: 'UPS',
          shippingAddress: {
            name: 'Jane Doe',
            addressLine1: '456 Oak St',
            city: 'Chicago',
            state: 'IL',
            postalCode: '60601',
            country: 'US'
          }
        };

        const result = serializeShippingInfo(minimalDTO);

        expect(result.org_id).toBe('org-123');
        expect(result.carrier).toBe('UPS');
        expect(result.tracking_number).toBeUndefined();
        expect(result.shipping_cost).toBeUndefined();
        expect(result.requires_signature).toBe(false); // Default value
        expect(result.is_insured).toBe(false); // Default value
      });
    });

    describe('deserializeShippingInfo', () => {
      it('should deserialize database row to shipping info DTO', () => {
        const result = deserializeShippingInfo(mockShippingDbRow);

        expect(result).toEqual({
          id: 'shipping-123',
          orgId: 'org-123',
          orderId: 'order-123',
          shipmentNumber: 'SHIP-20250120-0001',
          carrier: 'FedEx',
          service: 'Priority',
          trackingNumber: 'FX123456789',
          trackingUrl: 'https://fedex.com/track/FX123456789',
          labelUrl: 'https://labels.fedex.com/label-123.pdf',
          shippingCost: 15.99,
          weight: 2.5,
          dimensions: { length: 12, width: 8, height: 6, unit: 'inches' },
          shippingAddress: {
            name: 'John Doe',
            addressLine1: '123 Main St',
            city: 'Springfield',
            state: 'IL',
            postalCode: '62701',
            country: 'US'
          },
          originAddress: undefined,
          estimatedDeliveryDate: '2025-01-25T17:00:00Z',
          actualDeliveryDate: undefined,
          deliveryInstructions: undefined,
          requiresSignature: true,
          isInsured: true,
          insuranceAmount: 100.00,
          statusCode: 'shipped',
          deliveryAttempts: 0,
          lastStatusUpdate: undefined,
          notes: 'Handle with care',
          createdAt: '2025-01-20T10:00:00Z',
          updatedAt: '2025-01-20T10:00:00Z'
        });
      });

      it('should handle numeric string conversion correctly', () => {
        const rowWithStringNumbers = {
          ...mockShippingDbRow,
          shipping_cost: '25.50',
          weight: '3.75',
          insurance_amount: '150.00'
        };

        const result = deserializeShippingInfo(rowWithStringNumbers);

        expect(result.shippingCost).toBe(25.50);
        expect(result.weight).toBe(3.75);
        expect(result.insuranceAmount).toBe(150.00);
      });

      it('should handle null numeric values', () => {
        const rowWithNulls = {
          ...mockShippingDbRow,
          shipping_cost: null,
          weight: null,
          insurance_amount: null
        };

        const result = deserializeShippingInfo(rowWithNulls);

        expect(result.shippingCost).toBeUndefined();
        expect(result.weight).toBeUndefined();
        expect(result.insuranceAmount).toBeUndefined();
      });
    });
  });

  describe('Quality Check Transformers', () => {
    const mockQualityCheckDTO = {
      orgId: 'org-123',
      orderId: 'order-123',
      orderItemId: 'item-123',
      checkType: 'final_inspection',
      checkedBy: 'inspector-123',
      overallResult: 'pass',
      qualityScore: 95.5,
      defectsFound: 1,
      criticalDefects: 0,
      minorDefects: 1,
      checkResults: { 
        visual: 'pass', 
        dimensional: 'pass', 
        material: 'minor_defect' 
      },
      defectDetails: {
        minor_defects: [{ type: 'thread_loose', location: 'sleeve', severity: 'low' }]
      },
      correctionRequired: true,
      correctionInstructions: 'Tighten loose thread on left sleeve',
      reworkRequired: false,
      photoUrls: ['https://photos.example.com/qc-123-1.jpg'],
      notes: 'Overall quality is good with minor correction needed'
    };

    describe('serializeQualityCheck', () => {
      it('should serialize quality check DTO to database format', () => {
        const result = serializeQualityCheck(mockQualityCheckDTO);

        expect(result).toEqual({
          org_id: 'org-123',
          order_id: 'order-123',
          order_item_id: 'item-123',
          work_order_id: undefined,
          check_type: 'final_inspection',
          checklist_id: undefined,
          checked_by: 'inspector-123',
          overall_result: 'pass',
          quality_score: 95.5,
          defects_found: 1,
          critical_defects: 0,
          minor_defects: 1,
          check_results: { 
            visual: 'pass', 
            dimensional: 'pass', 
            material: 'minor_defect' 
          },
          defect_details: {
            minor_defects: [{ type: 'thread_loose', location: 'sleeve', severity: 'low' }]
          },
          correction_required: true,
          correction_instructions: 'Tighten loose thread on left sleeve',
          corrected_by: undefined,
          corrected_at: undefined,
          rework_required: false,
          rework_instructions: undefined,
          photo_urls: ['https://photos.example.com/qc-123-1.jpg'],
          approved_by: undefined,
          approved_at: undefined,
          notes: 'Overall quality is good with minor correction needed'
        });
      });
    });

    describe('deserializeQualityCheck', () => {
      it('should deserialize database row to quality check DTO', () => {
        const mockDbRow = {
          id: 'qc-123',
          org_id: 'org-123',
          order_id: 'order-123',
          order_item_id: 'item-123',
          work_order_id: null,
          check_type: 'final_inspection',
          checklist_id: null,
          checked_by: 'inspector-123',
          checked_at: '2025-01-20T10:00:00Z',
          overall_result: 'pass',
          quality_score: '95.5',
          defects_found: 1,
          critical_defects: 0,
          minor_defects: 1,
          check_results: { visual: 'pass', dimensional: 'pass' },
          defect_details: { minor_defects: [] },
          correction_required: true,
          correction_instructions: 'Fix minor issues',
          corrected_by: null,
          corrected_at: null,
          rework_required: false,
          rework_instructions: null,
          photo_urls: ['photo1.jpg'],
          approved_by: null,
          approved_at: null,
          notes: 'Good quality',
          created_at: '2025-01-20T10:00:00Z',
          updated_at: '2025-01-20T10:00:00Z'
        };

        const result = deserializeQualityCheck(mockDbRow);

        expect(result.id).toBe('qc-123');
        expect(result.orgId).toBe('org-123');
        expect(result.qualityScore).toBe(95.5);
        expect(result.checkType).toBe('final_inspection');
        expect(result.overallResult).toBe('pass');
        expect(result.correctionRequired).toBe(true);
        expect(result.createdAt).toBe('2025-01-20T10:00:00Z');
      });

      it('should handle null quality score', () => {
        const mockDbRow = {
          id: 'qc-123',
          quality_score: null,
          checked_at: '2025-01-20T10:00:00Z',
          created_at: '2025-01-20T10:00:00Z',
          updated_at: '2025-01-20T10:00:00Z'
        };

        const result = deserializeQualityCheck(mockDbRow);
        expect(result.qualityScore).toBeUndefined();
      });
    });
  });

  describe('Utility Functions', () => {
    describe('parseDecimal', () => {
      it('should parse valid decimal values', () => {
        expect(parseDecimal('123.45')).toBe(123.45);
        expect(parseDecimal('0')).toBe(0);
        expect(parseDecimal('999.999')).toBe(999.999);
        expect(parseDecimal(123.45)).toBe(123.45);
      });

      it('should return undefined for invalid values', () => {
        expect(parseDecimal(null)).toBeUndefined();
        expect(parseDecimal(undefined)).toBeUndefined();
        expect(parseDecimal('invalid')).toBeUndefined();
        expect(parseDecimal('')).toBeUndefined();
        expect(parseDecimal(NaN)).toBeUndefined();
      });

      it('should handle edge cases', () => {
        expect(parseDecimal('0.0')).toBe(0);
        expect(parseDecimal('-123.45')).toBe(-123.45);
        expect(parseDecimal('123.')).toBe(123);
        expect(parseDecimal('.45')).toBe(0.45);
      });
    });

    describe('serializeArray', () => {
      it('should serialize array of DTOs using provided serializer', () => {
        const dtos = [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' }
        ];

        const serializer = (dto: any) => ({
          first_name: dto.firstName,
          last_name: dto.lastName
        });

        const result = serializeArray(dtos, serializer);

        expect(result).toEqual([
          { first_name: 'John', last_name: 'Doe' },
          { first_name: 'Jane', last_name: 'Smith' }
        ]);
      });

      it('should handle empty arrays', () => {
        const result = serializeArray([], (dto: any) => dto);
        expect(result).toEqual([]);
      });
    });

    describe('deserializeArray', () => {
      it('should deserialize array of database rows using provided deserializer', () => {
        const rows = [
          { first_name: 'John', last_name: 'Doe' },
          { first_name: 'Jane', last_name: 'Smith' }
        ];

        const deserializer = (row: any) => ({
          firstName: row.first_name,
          lastName: row.last_name
        });

        const result = deserializeArray(rows, deserializer);

        expect(result).toEqual([
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' }
        ]);
      });

      it('should handle empty arrays', () => {
        const result = deserializeArray([], (row: any) => row);
        expect(result).toEqual([]);
      });
    });

    describe('generateShipmentNumber', () => {
      beforeEach(() => {
        // Mock Date to ensure consistent tests
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-20T10:00:00Z'));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should generate shipment number with correct format', () => {
        // Mock Math.random to return predictable value
        vi.spyOn(Math, 'random').mockReturnValue(0.5);

        const result = generateShipmentNumber('org-123');

        expect(result).toMatch(/^SHIP-20250120-\d{4}$/);
        expect(result).toBe('SHIP-20250120-5000');

        vi.restoreAllMocks();
      });

      it('should generate different numbers for different calls', () => {
        const numbers = new Set();
        
        // Generate multiple shipment numbers
        for (let i = 0; i < 10; i++) {
          numbers.add(generateShipmentNumber('org-123'));
        }

        // Should generate different numbers (high probability)
        expect(numbers.size).toBeGreaterThan(1);
      });

      it('should use current date in format', () => {
        vi.setSystemTime(new Date('2025-12-31T23:59:59Z'));
        
        const result = generateShipmentNumber('org-123');
        expect(result).toMatch(/^SHIP-20251231-\d{4}$/);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed data gracefully', () => {
      const malformedDbRow = {
        id: 'test-123',
        // Missing required fields
        org_id: null,
        order_id: undefined,
        shipping_cost: 'not-a-number',
        weight: 'invalid',
        created_at: 'invalid-date'
      };

      expect(() => deserializeShippingInfo(malformedDbRow)).not.toThrow();
      
      const result = deserializeShippingInfo(malformedDbRow);
      expect(result.shippingCost).toBeUndefined();
      expect(result.weight).toBeUndefined();
    });

    it('should preserve complex nested data structures', () => {
      const complexMetadata = {
        workflow: {
          steps: [
            { name: 'step1', completed: true, data: { value: 123 } },
            { name: 'step2', completed: false, data: { value: 456 } }
          ]
        },
        customFields: {
          field1: 'value1',
          field2: { nestedField: 'nestedValue' }
        }
      };

      const dto = {
        orgId: 'org-123',
        orderId: 'order-123',
        eventCode: 'COMPLEX_EVENT',
        eventType: 'workflow',
        metadata: complexMetadata
      };

      const serialized = serializeFulfillmentEvent(dto);
      expect(serialized.metadata).toEqual(complexMetadata);

      const dbRow = {
        id: 'event-123',
        org_id: 'org-123',
        order_id: 'order-123',
        event_code: 'COMPLEX_EVENT',
        event_type: 'workflow',
        metadata: complexMetadata,
        created_at: '2025-01-20T10:00:00Z'
      };

      const deserialized = deserializeFulfillmentEvent(dbRow);
      expect(deserialized.metadata).toEqual(complexMetadata);
    });

    it('should handle large numeric values correctly', () => {
      const largeValues = {
        shipping_cost: '999999.99',
        weight: '50000.50',
        insurance_amount: '1000000.00'
      };

      const dbRow = {
        id: 'shipping-123',
        org_id: 'org-123',
        order_id: 'order-123',
        carrier: 'Freight',
        shipping_address: { name: 'Test' },
        ...largeValues,
        created_at: '2025-01-20T10:00:00Z',
        updated_at: '2025-01-20T10:00:00Z'
      };

      const result = deserializeShippingInfo(dbRow);
      expect(result.shippingCost).toBe(999999.99);
      expect(result.weight).toBe(50000.50);
      expect(result.insuranceAmount).toBe(1000000.00);
    });
  });
});