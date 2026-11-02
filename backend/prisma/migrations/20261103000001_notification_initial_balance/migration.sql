DROP TRIGGER product_notification ON products;
CREATE TRIGGER product_notification AFTER UPDATE OF name, is_active, minimum_stock, reorder_point ON products FOR EACH ROW EXECUTE FUNCTION product_notification_trigger();
